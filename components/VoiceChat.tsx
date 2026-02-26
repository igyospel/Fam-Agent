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

// Always prefer female Indonesian voice
function getBestVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    return (
        // Explicit female Indonesian (Google)
        voices.find(v => v.lang.startsWith('id') && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang.startsWith('id') && v.name.toLowerCase().includes('google')) ||
        voices.find(v => v.lang.startsWith('id')) ||
        // Fallback: Google English Female
        voices.find(v => v.name === 'Google UK English Female') ||
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices[0] ||
        null
    );
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

    // Browser SpeechSynthesis fallback — force female Indonesian
    const speakWithBrowser = (text: string, onDone?: () => void) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'id-ID';
        utter.rate = 0.92;
        utter.pitch = 1.6;   // High pitch = clearly female
        utter.volume = 1.0;

        const applyVoice = () => {
            const voice = getBestVoice();
            if (voice) {
                console.log('[TTS] Using browser voice:', voice.name, voice.lang);
                utter.voice = voice;
            }
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            applyVoice();
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true });
        }

        utter.onend = () => { setCurrentSpeakingText(''); onDone?.(); };
        utter.onerror = () => { setCurrentSpeakingText(''); onDone?.(); };
        synthRef.current = utter;
        window.speechSynthesis.speak(utter);
    };

    const speakText = useCallback((text: string, onDone?: () => void) => {
        if (isMuted || !text.trim()) { onDone?.(); return; }
        window.speechSynthesis.cancel();
        if ((window as any).responsiveVoice) (window as any).responsiveVoice.cancel();

        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setCurrentSpeakingText(clean.slice(0, 80) + (clean.length > 80 ? '...' : ''));
        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking...');

        // 1. Try ResponsiveVoice (Google TTS under the hood — most natural)
        const rv = (window as any).responsiveVoice;
        if (rv && rv.voiceSupport()) {
            console.log('[TTS] Using ResponsiveVoice: Indonesian Female');
            rv.speak(clean, 'Indonesian Female', {
                pitch: 1.1,
                rate: 0.95,
                volume: 1,
                onend: () => { setCurrentSpeakingText(''); onDone?.(); },
                onerror: () => { speakWithBrowser(clean, onDone); },
            });
            return;
        }

        // 2. Fallback: browser SpeechSynthesis with best available voice
        speakWithBrowser(clean, onDone);
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

    // Color config per state
    const stateColor = {
        idle: { glow: '', bar: 'bg-white/20', label: 'text-white/30' },
        listening: { glow: 'shadow-[0_0_80px_rgba(34,197,94,0.25)]', bar: 'bg-green-400', label: 'text-green-400' },
        thinking: { glow: 'shadow-[0_0_80px_rgba(251,146,60,0.25)]', bar: 'bg-orange-400', label: 'text-orange-400' },
        speaking: { glow: 'shadow-[0_0_80px_rgba(96,165,250,0.25)]', bar: 'bg-blue-400', label: 'text-blue-400' },
    };
    const sc = stateColor[voiceState];

    const orbBorder = {
        idle: 'border-white/10',
        listening: 'border-green-500/40',
        thinking: 'border-orange-500/40',
        speaking: 'border-blue-500/40',
    }[voiceState];

    const stateLabel = {
        idle: 'Tap to speak',
        listening: 'Listening',
        thinking: 'Thinking…',
        speaking: 'Speaking',
    }[voiceState];

    // 7 animated sound-bar columns
    const BAR_HEIGHTS = [0.45, 0.75, 1, 0.65, 1, 0.8, 0.5];

    return (
        <>
            <style>{`
                @keyframes vcBar {
                    0%, 100% { transform: scaleY(0.2); }
                    50%       { transform: scaleY(1); }
                }
            `}</style>
            <div className="fixed inset-0 z-[9999] bg-[#060606]/97 backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-6">

                {/* ── Top bar ── */}
                <div className="w-full max-w-sm flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25">
                        Voice Mode
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setIsMuted(v => !v); if (!isMuted) stopSpeaking(); }}
                            className={`p-2 rounded-xl border text-[13px] transition-all ${isMuted
                                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                : 'border-white/10 bg-white/[0.04] text-white/30 hover:text-white'}`}
                        >
                            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-white/30 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Center ── */}
                <div className="flex flex-col items-center gap-10 w-full max-w-sm">

                    {/* Transcript area */}
                    <div className="min-h-[56px] w-full text-center px-2">
                        {transcript && voiceState !== 'listening' && (
                            <p className="text-white/75 text-[15px] font-medium leading-relaxed">
                                "{transcript}"
                            </p>
                        )}
                        {(interimTranscript || (voiceState === 'listening' && finalTextRef.current)) && (
                            <div className="space-y-0.5">
                                {finalTextRef.current && (
                                    <p className="text-white/70 text-[15px] font-medium">"{finalTextRef.current}"</p>
                                )}
                                {interimTranscript && (
                                    <p className="text-white/30 text-[14px] italic">{interimTranscript}…</p>
                                )}
                            </div>
                        )}
                        {currentSpeakingText && voiceState === 'speaking' && (
                            <p className="text-blue-300/60 text-[13px] leading-relaxed">{currentSpeakingText}</p>
                        )}
                    </div>

                    {/* Orb */}
                    <div
                        onClick={handleOrbClick}
                        className={`relative w-44 h-44 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-700 select-none ${orbBorder} ${sc.glow}`}
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                        {/* Ping ring */}
                        {(voiceState === 'listening' || voiceState === 'speaking') && (
                            <span
                                className={`absolute inset-[-14px] rounded-full border opacity-30 animate-ping ${voiceState === 'listening' ? 'border-green-400' : 'border-blue-400'}`}
                                style={{ animationDuration: '1.6s' }}
                            />
                        )}

                        {/* Sound bars (animated when active) */}
                        <div className="flex items-end gap-[4px] h-9">
                            {BAR_HEIGHTS.map((h, i) => {
                                const active = voiceState === 'listening' || voiceState === 'speaking';
                                return (
                                    <div
                                        key={i}
                                        className={`w-[4px] rounded-full ${sc.bar} transition-all duration-300`}
                                        style={{
                                            height: active ? `${h * 36}px` : '4px',
                                            animation: active ? `vcBar ${0.7 + i * 0.08}s ease-in-out infinite` : 'none',
                                            animationDelay: `${i * 0.09}s`,
                                            opacity: active ? 1 : 0.2,
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Spinning arc when thinking */}
                        {voiceState === 'thinking' && (
                            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '1.2s' }} viewBox="0 0 176 176">
                                <circle
                                    cx="88" cy="88" r="82"
                                    fill="none"
                                    stroke="rgba(251,146,60,0.5)"
                                    strokeWidth="2"
                                    strokeDasharray="100 420"
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                    </div>

                    {/* State label + hint */}
                    <div className="text-center space-y-1">
                        <p className={`text-[15px] font-semibold tracking-wide ${sc.label}`}>{stateLabel}</p>
                        <p className="text-[12px] text-white/20">
                            {voiceState === 'idle' && 'Tap the orb to start'}
                            {voiceState === 'listening' && 'Pause 1.8s to auto-send · tap to send now'}
                            {voiceState === 'speaking' && 'Tap to interrupt'}
                            {voiceState === 'thinking' && 'Processing your message…'}
                        </p>
                    </div>
                </div>

                {/* ── Bottom ── */}
                <div className="flex items-center gap-3">
                    {voiceState === 'listening' && finalTextRef.current.trim() && (
                        <button
                            onClick={sendCurrentTranscript}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-[13px] font-semibold hover:bg-green-500/25 transition-all"
                        >
                            <Mic size={14} />
                            Send
                        </button>
                    )}
                    <button
                        onClick={() => {
                            stopListening(); stopSpeaking();
                            finalTextRef.current = '';
                            setTranscript(''); setInterimTranscript('');
                            setVoiceState('idle'); setStatusText('Tap to start speaking');
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/30 text-[13px] font-medium hover:text-white hover:bg-white/10 transition-all"
                    >
                        <RotateCcw size={13} />
                        Reset
                    </button>
                </div>

            </div>
        </>
    );
};

export default VoiceChat;
