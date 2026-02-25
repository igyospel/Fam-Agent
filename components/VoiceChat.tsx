import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Square, Volume2, VolumeX, RotateCcw, Languages } from 'lucide-react';

interface VoiceChatProps {
    onClose: () => void;
    onSendMessage: (text: string) => void;
    lastAIMessage: string;
    isAILoading: boolean;
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/\$\$[\s\S]*?\$\$/g, 'formula')
        .replace(/\$[^$]+\$/g, 'formula')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#+\s/g, '')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[_~]/g, '')
        .trim();
}

function getBestVoice(lang: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(lang === 'id' ? 'id' : 'en'));
    const local = voices.find(v => v.lang.startsWith(lang === 'id' ? 'id' : 'en') && v.localService);
    return local || preferred || voices[0] || null;
}

const LANG_OPTIONS = [
    { code: 'id', label: 'ID', full: 'id-ID', desc: 'Indonesia' },
    { code: 'en', label: 'EN', full: 'en-US', desc: 'English' },
    { code: 'auto', label: 'AUTO', full: '', desc: 'Auto detect' },
];

// Animated sound bar component
const SoundBars: React.FC<{ active: boolean; color: string }> = ({ active, color }) => (
    <div className="flex items-end gap-[3px] h-8">
        {[0.6, 1, 0.75, 1, 0.5, 0.85, 0.65].map((h, i) => (
            <div
                key={i}
                className={`w-[3px] rounded-full transition-all ${color}`}
                style={{
                    height: active ? `${h * 32}px` : '4px',
                    animation: active ? `soundBar 0.8s ease-in-out infinite alternate` : 'none',
                    animationDelay: `${i * 0.1}s`,
                    opacity: active ? 1 : 0.3,
                    transition: 'height 0.3s ease, opacity 0.3s ease',
                }}
            />
        ))}
    </div>
);

// Thinking dots
const ThinkingDots: React.FC = () => (
    <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
            <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                style={{
                    animation: 'thinkDot 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                }}
            />
        ))}
    </div>
);

const VoiceChat: React.FC<VoiceChatProps> = ({ onClose, onSendMessage, lastAIMessage, isAILoading }) => {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [statusText, setStatusText] = useState('Tap the mic to start');
    const [isMuted, setIsMuted] = useState(false);
    const [langIdx, setLangIdx] = useState(0); // default: Indonesian
    const [currentLang, setCurrentLang] = useState(LANG_OPTIONS[0]);

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTextRef = useRef('');
    const spokenMessageRef = useRef('');

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
    }, []);

    const sendCurrentTranscript = useCallback(() => {
        const text = finalTextRef.current.trim();
        if (!text) return;
        stopListening();
        setTranscript(text);
        setInterimTranscript('');
        setVoiceState('thinking');
        setStatusText('Processing...');
        finalTextRef.current = '';
        onSendMessage(text);
    }, [stopListening, onSendMessage]);

    const startListening = useCallback((lang: typeof LANG_OPTIONS[0]) => {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        stopSpeaking();
        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        // lang.full = '' means browser auto-detect (best for mixed ID/EN)
        if (lang.full) recognition.lang = lang.full;
        recognition.maxAlternatives = 3; // Consider more alternatives for better accuracy

        recognition.onstart = () => {
            setVoiceState('listening');
            setStatusText(`Listening in ${lang.desc}...`);
        };

        recognition.onresult = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            let interim = '';
            let finalChunk = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                // Take the most confident alternative
                const result = event.results[i];
                const best = result[0].transcript;
                if (result.isFinal) {
                    finalChunk += best + ' ';
                } else {
                    interim += best;
                }
            }

            if (finalChunk) {
                finalTextRef.current = (finalTextRef.current + finalChunk).trimStart();
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }

            if (finalTextRef.current.trim()) {
                // Auto-send after 2 seconds of silence
                silenceTimerRef.current = setTimeout(() => {
                    sendCurrentTranscript();
                }, 2000);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                setStatusText('No speech detected...');
            } else if (event.error !== 'aborted') {
                setVoiceState('idle');
                setStatusText('Error. Tap mic to retry.');
            }
        };

        recognition.onend = () => {
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [stopSpeaking, sendCurrentTranscript]);

    const speakText = useCallback((text: string, onDone?: () => void) => {
        if (isMuted || !text.trim()) { onDone?.(); return; }
        window.speechSynthesis.cancel();
        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking...');

        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.05;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        const assignVoice = () => {
            const voice = getBestVoice(currentLang.code);
            if (voice) utter.voice = voice;
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) assignVoice();
        else window.speechSynthesis.addEventListener('voiceschanged', assignVoice, { once: true });

        utter.onend = () => onDone?.();
        utter.onerror = () => onDone?.();

        window.speechSynthesis.speak(utter);
    }, [isMuted, currentLang]);

    // When AI finishes → speak response → then listen again
    useEffect(() => {
        if (!isAILoading && lastAIMessage && lastAIMessage !== spokenMessageRef.current) {
            spokenMessageRef.current = lastAIMessage;
            speakText(lastAIMessage, () => {
                setTranscript('');
                setTimeout(() => startListening(currentLang), 400);
            });
        }
    }, [isAILoading, lastAIMessage]);

    // Cleanup
    useEffect(() => {
        return () => { stopListening(); stopSpeaking(); };
    }, []);

    const toggleListening = () => {
        if (voiceState === 'listening') {
            if (finalTextRef.current.trim()) {
                sendCurrentTranscript();
            } else {
                stopListening();
                setVoiceState('idle');
                setStatusText('Tap the mic to start');
            }
        } else if (voiceState === 'speaking') {
            stopSpeaking();
            startListening(currentLang);
        } else if (voiceState === 'idle') {
            startListening(currentLang);
        }
    };

    const cycleLang = () => {
        const next = (langIdx + 1) % LANG_OPTIONS.length;
        setLangIdx(next);
        setCurrentLang(LANG_OPTIONS[next]);
        if (voiceState === 'listening') {
            stopListening();
            setTimeout(() => startListening(LANG_OPTIONS[next]), 200);
        }
    };

    const handleReset = () => {
        stopListening();
        stopSpeaking();
        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');
        setVoiceState('idle');
        setStatusText('Tap the mic to start');
    };

    const handleClose = () => { stopListening(); stopSpeaking(); onClose(); };

    // Orb color per state
    const orbColors = {
        idle: { ring: 'border-white/10', glow: '', core: 'bg-white/10' },
        listening: { ring: 'border-green-500/40', glow: 'shadow-[0_0_60px_rgba(34,197,94,0.2)]', core: 'bg-green-500/20' },
        thinking: { ring: 'border-amber-500/40', glow: 'shadow-[0_0_60px_rgba(245,158,11,0.2)]', core: 'bg-amber-500/20' },
        speaking: { ring: 'border-blue-500/40', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.2)]', core: 'bg-blue-500/20' },
    };
    const orb = orbColors[voiceState];

    const barColor = {
        idle: 'bg-white/20',
        listening: 'bg-green-400',
        thinking: 'bg-amber-400',
        speaking: 'bg-blue-400',
    }[voiceState];

    return (
        <>
            {/* CSS for animations */}
            <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        @keyframes thinkDot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>

            <div className="fixed inset-0 z-[9999] bg-[#050505]/98 backdrop-blur-2xl flex flex-col items-center justify-between py-12 px-6">

                {/* Top bar */}
                <div className="w-full max-w-sm flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/30 tracking-[0.2em] uppercase">Voice Mode</span>
                    <div className="flex items-center gap-2">
                        {/* Lang toggle */}
                        <button
                            onClick={cycleLang}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/50 hover:text-white hover:border-white/20 transition-all"
                            title={`Switch language (currently ${currentLang.desc})`}
                        >
                            <Languages size={12} />
                            {currentLang.label}
                        </button>
                        {/* Mute */}
                        <button
                            onClick={() => { setIsMuted(!isMuted); if (!isMuted) stopSpeaking(); }}
                            className={`p-2 rounded-lg border transition-all ${isMuted ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'}`}
                            title={isMuted ? 'Unmute AI' : 'Mute AI'}
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        {/* Close */}
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Center section */}
                <div className="flex flex-col items-center gap-10 flex-1 justify-center w-full max-w-sm">

                    {/* Main orb */}
                    <div
                        onClick={toggleListening}
                        className={`
              relative w-40 h-40 rounded-full border-2 flex items-center justify-center cursor-pointer
              transition-all duration-700 select-none
              ${orb.ring} ${orb.glow} ${orb.core}
            `}
                    >
                        {/* Outer pulse ring (listening / speaking) */}
                        {(voiceState === 'listening' || voiceState === 'speaking') && (
                            <span className={`
                absolute inset-[-12px] rounded-full border
                ${voiceState === 'listening' ? 'border-green-500/20 animate-ping' : 'border-blue-500/20 animate-ping'}
              `} style={{ animationDuration: '1.5s' }} />
                        )}

                        {/* Inner content */}
                        <div className="flex flex-col items-center gap-3">
                            {/* Sound bars visualization */}
                            <SoundBars active={voiceState === 'listening' || voiceState === 'speaking'} color={barColor} />

                            {/* Thinking dots */}
                            {voiceState === 'thinking' && <ThinkingDots />}
                        </div>

                        {/* Mic icon overlay when idle */}
                        {voiceState === 'idle' && (
                            <Mic size={36} className="text-white/30" />
                        )}
                    </div>

                    {/* Status */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-white/50 font-medium">{statusText}</p>
                        {voiceState === 'listening' && (
                            <p className="text-xs text-white/20">Pause for 2s to auto-send · tap orb to send now</p>
                        )}
                        {voiceState === 'speaking' && (
                            <p className="text-xs text-white/20">Tap orb to interrupt</p>
                        )}
                    </div>

                    {/* Transcript area */}
                    <div className="w-full min-h-[72px] flex items-center justify-center px-4">
                        {transcript && voiceState !== 'listening' && (
                            <div className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-4">
                                <p className="text-white/80 text-sm leading-relaxed text-center">"{transcript}"</p>
                            </div>
                        )}
                        {(interimTranscript || (voiceState === 'listening' && finalTextRef.current)) && (
                            <div className="w-full text-center space-y-1">
                                {finalTextRef.current && (
                                    <p className="text-white/70 text-sm leading-relaxed">"{finalTextRef.current}"</p>
                                )}
                                {interimTranscript && (
                                    <p className="text-white/30 text-sm italic">{interimTranscript}...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom actions */}
                <div className="flex items-center gap-3 w-full max-w-sm justify-center">
                    {voiceState === 'listening' && finalTextRef.current.trim() && (
                        <button
                            onClick={sendCurrentTranscript}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                        >
                            Send now
                        </button>
                    )}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-medium hover:text-white hover:border-white/20 transition-all"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>
                </div>

            </div>
        </>
    );
};

export default VoiceChat;
