import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface VoiceChatProps {
    onClose: () => void;
    onSendMessage: (text: string) => void;
    lastAIMessage: string; // latest AI response to speak
    isAILoading: boolean;
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Strip markdown/LaTeX for clean TTS
function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '') // code blocks
        .replace(/`[^`]+`/g, '')        // inline code
        .replace(/\$\$[\s\S]*?\$\$/g, 'formula')  // LaTeX block
        .replace(/\$[^$]+\$/g, 'formula')          // LaTeX inline
        .replace(/\*\*([^*]+)\*\*/g, '$1')         // bold
        .replace(/\*([^*]+)\*/g, '$1')             // italic
        .replace(/#+\s/g, '')                       // headers
        .replace(/^\s*[-*+]\s/gm, '')              // bullet points
        .replace(/^\s*\d+\.\s/gm, '')              // numbered lists
        .replace(/\n{2,}/g, '. ')                  // double newlines → pause
        .replace(/\n/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
        .replace(/[_~]/g, '')
        .trim();
}

// Get the best available Indonesian voice, fallback to any
function getBestVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    // Prefer Indonesian
    const idVoice = voices.find(v => v.lang.startsWith('id'));
    if (idVoice) return idVoice;
    // Fallback: English premium voice
    const enUS = voices.find(v => v.lang === 'en-US' && v.localService);
    return enUS || voices[0] || null;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onClose, onSendMessage, lastAIMessage, isAILoading }) => {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [statusText, setStatusText] = useState('Tap to start speaking');
    const [isMuted, setIsMuted] = useState(false);
    const [currentSpeakingText, setCurrentSpeakingText] = useState('');

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTextRef = useRef('');
    const spokenMessageRef = useRef(''); // track last spoken AI message to avoid repeating
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setCurrentSpeakingText('');
    }, []);

    const sendCurrentTranscript = useCallback(() => {
        const text = finalTextRef.current.trim();
        if (!text) return;
        stopListening();
        setTranscript(text);
        setInterimTranscript('');
        setVoiceState('thinking');
        setStatusText('Thinking...');
        finalTextRef.current = '';
        onSendMessage(text);
    }, [stopListening, onSendMessage]);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        stopSpeaking();
        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setVoiceState('listening');
            setStatusText('Listening...');
        };

        recognition.onresult = (event: any) => {
            // Reset silence timer on every new result
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            let interim = '';
            let finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalChunk += t + ' ';
                } else {
                    interim += t;
                }
            }

            if (finalChunk) {
                finalTextRef.current = (finalTextRef.current + finalChunk).trimStart();
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }

            // Auto-send after 1.8s of silence (only if we have some text)
            if (finalTextRef.current.trim()) {
                silenceTimerRef.current = setTimeout(() => {
                    sendCurrentTranscript();
                }, 1800);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                setStatusText('No speech detected, try again...');
            } else if (event.error !== 'aborted') {
                console.warn('[VoiceChat] STT error:', event.error);
                setVoiceState('idle');
                setStatusText('Error. Tap to retry.');
            }
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            if (voiceState === 'listening') {
                // Ended unexpectedly — if we have text, send it
                if (finalTextRef.current.trim()) {
                    sendCurrentTranscript();
                }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [stopSpeaking, sendCurrentTranscript, voiceState]);

    const speakText = useCallback((text: string, onDone?: () => void) => {
        if (isMuted || !text.trim()) {
            onDone?.();
            return;
        }
        window.speechSynthesis.cancel();
        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setCurrentSpeakingText(clean.slice(0, 80) + (clean.length > 80 ? '...' : ''));
        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking...');

        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.05;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        // Try to get a good voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const voice = getBestVoice();
            if (voice) utter.voice = voice;
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                const v = getBestVoice();
                if (v) utter.voice = v;
            }, { once: true });
        }

        utter.onend = () => {
            setCurrentSpeakingText('');
            onDone?.();
        };
        utter.onerror = () => {
            setCurrentSpeakingText('');
            onDone?.();
        };

        synthRef.current = utter;
        window.speechSynthesis.speak(utter);
    }, [isMuted]);

    // When AI finishes loading and has a new response → speak it
    useEffect(() => {
        if (!isAILoading && lastAIMessage && lastAIMessage !== spokenMessageRef.current) {
            spokenMessageRef.current = lastAIMessage;
            speakText(lastAIMessage, () => {
                // After AI finishes speaking, start listening again
                setTranscript('');
                setTimeout(() => startListening(), 300);
            });
        }
    }, [isAILoading, lastAIMessage]);

    // Start listening immediately when opened
    useEffect(() => {
        const timer = setTimeout(() => startListening(), 500);
        return () => {
            clearTimeout(timer);
            stopListening();
            stopSpeaking();
        };
    }, []);

    const handleOrbClick = () => {
        if (voiceState === 'listening') {
            if (finalTextRef.current.trim()) {
                sendCurrentTranscript();
            } else {
                // Nothing said yet — just stop
                stopListening();
                setVoiceState('idle');
                setStatusText('Tap to start speaking');
            }
        } else if (voiceState === 'speaking') {
            // Interrupt AI, start listening
            stopSpeaking();
            startListening();
        } else if (voiceState === 'idle') {
            startListening();
        }
    };

    const handleClose = () => {
        stopListening();
        stopSpeaking();
        onClose();
    };

    // Orb animation classes based on state
    const orbConfig = {
        idle: {
            outer: 'bg-white/5 border border-white/10',
            inner: 'bg-white/10',
            core: 'bg-gray-600',
            ring1: '',
            ring2: '',
        },
        listening: {
            outer: 'bg-green-500/10 border border-green-500/20',
            inner: 'bg-green-500/15',
            core: 'bg-green-400',
            ring1: 'animate-ping bg-green-500/20',
            ring2: 'animate-pulse bg-green-500/10',
        },
        thinking: {
            outer: 'bg-orange-500/10 border border-orange-500/20',
            inner: 'bg-orange-500/15 animate-spin',
            core: 'bg-orange-400 animate-pulse',
            ring1: 'animate-pulse bg-orange-500/15',
            ring2: '',
        },
        speaking: {
            outer: 'bg-blue-500/10 border border-blue-500/20',
            inner: 'bg-blue-500/15',
            core: 'bg-blue-400',
            ring1: 'animate-ping bg-blue-500/20',
            ring2: 'animate-pulse bg-blue-500/10',
        },
    };

    const orb = orbConfig[voiceState];

    const stateEmoji = {
        idle: '💤',
        listening: '🎙️',
        thinking: '⚙️',
        speaking: '🔊',
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between py-16 px-8">

            {/* Top bar */}
            <div className="w-full flex items-center justify-between max-w-md">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-sm font-semibold text-white/60 tracking-wide uppercase">Voice Mode</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setIsMuted(!isMuted);
                            if (!isMuted) stopSpeaking();
                        }}
                        className={`p-2 rounded-xl border transition-all ${isMuted ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
                        title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Center — Orb */}
            <div className="flex flex-col items-center gap-8">
                {/* Transcript */}
                <div className="min-h-[60px] max-w-sm text-center">
                    {transcript && (
                        <p className="text-white/90 text-lg font-medium leading-relaxed">
                            "{transcript}"
                        </p>
                    )}
                    {interimTranscript && !transcript && (
                        <p className="text-gray-500 text-base italic">
                            {interimTranscript}...
                        </p>
                    )}
                    {currentSpeakingText && voiceState === 'speaking' && (
                        <p className="text-blue-300/80 text-sm leading-relaxed">
                            {currentSpeakingText}
                        </p>
                    )}
                </div>

                {/* Animated Orb */}
                <div className="relative flex items-center justify-center cursor-pointer" onClick={handleOrbClick}>
                    {/* Outer ring 2 */}
                    {orb.ring2 && (
                        <span className={`absolute w-52 h-52 rounded-full ${orb.ring2}`} style={{ animationDuration: '2s' }} />
                    )}
                    {/* Outer ring 1 */}
                    {orb.ring1 && (
                        <span className={`absolute w-44 h-44 rounded-full ${orb.ring1}`} style={{ animationDelay: '0.3s' }} />
                    )}
                    {/* Outer shell */}
                    <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${orb.outer}`}>
                        {/* Inner */}
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${orb.inner}`}>
                            {/* Core */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${orb.core}`}>
                                <span className="text-2xl select-none">{stateEmoji[voiceState]}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="text-center">
                    <p className="text-white/70 text-base font-medium">{statusText}</p>
                    {voiceState === 'listening' && (
                        <p className="text-gray-600 text-xs mt-1">Tap orb to send • auto-sends after pause</p>
                    )}
                    {voiceState === 'speaking' && (
                        <p className="text-gray-600 text-xs mt-1">Tap orb to interrupt</p>
                    )}
                </div>
            </div>

            {/* Bottom — action buttons */}
            <div className="flex items-center gap-4">
                {voiceState === 'listening' && finalTextRef.current.trim() && (
                    <button
                        onClick={sendCurrentTranscript}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm hover:bg-green-500/30 transition-all"
                    >
                        <Mic size={16} />
                        Send now
                    </button>
                )}
                <button
                    onClick={() => {
                        stopListening();
                        stopSpeaking();
                        finalTextRef.current = '';
                        setTranscript('');
                        setInterimTranscript('');
                        setVoiceState('idle');
                        setStatusText('Tap to start speaking');
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
                >
                    <RotateCcw size={16} />
                    Reset
                </button>
            </div>
        </div>
    );
};

export default VoiceChat;
