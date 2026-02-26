import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Volume2, VolumeX, RotateCcw, Languages } from 'lucide-react';

// Vite injects GEMINI_KEY_1 from .env.local at build time via vite.config.ts define
declare const __GEMINI_KEY__: string;

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

function createWavBlob(base64Data: string, sampleRate = 24000): string {
    const raw = atob(base64Data);
    const rawLength = raw.length;
    const pcm = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; i++) pcm[i] = raw.charCodeAt(i);

    const buf = new ArrayBuffer(44 + rawLength);
    const view = new DataView(buf);
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + rawLength, true);
    view.setUint32(8, 0x57415645, false); // 'WAVE'
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);  // block align
    view.setUint16(34, 16, true); // bits per sample
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, rawLength, true);
    new Uint8Array(buf, 44).set(pcm);

    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

const LANG_OPTIONS = [
    { code: 'id', label: 'ID', full: 'id-ID', desc: 'Indonesia' },
    { code: 'en', label: 'EN', full: 'en-US', desc: 'English' },
    { code: 'auto', label: 'AUTO', full: '', desc: 'Auto detect' },
];

const SoundBars: React.FC<{ active: boolean; color: string }> = ({ active, color }) => (
    <div className="flex items-end gap-[3px] h-8">
        {[0.6, 1, 0.75, 1, 0.5, 0.85, 0.65].map((h, i) => (
            <div
                key={i}
                className={`w-[3px] rounded-full ${color}`}
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

const ThinkingDots: React.FC = () => (
    <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
            <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                style={{ animation: 'thinkDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
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
    const [langIdx, setLangIdx] = useState(0);
    const [currentLang, setCurrentLang] = useState(LANG_OPTIONS[0]);

    // ─── REFS (no stale closure issues) ───────────────────────────────────────
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTextRef = useRef('');
    const spokenMessageRef = useRef('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Control refs — these mirror state so callbacks can always read the latest value
    const isListeningRef = useRef(false);    // true = we WANT to be listening
    const currentLangRef = useRef(LANG_OPTIONS[0]);
    const isMutedRef = useRef(false);

    // Callback ref — lets onresult call sendCurrentTranscript without stale closure
    const sendFnRef = useRef<() => void>(() => { });

    // Keep control refs in sync with state
    useEffect(() => { currentLangRef.current = currentLang; }, [currentLang]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // ─── CORE RECOGNITION FUNCTION ────────────────────────────────────────────
    // EMPTY dependency array — this function never changes.
    // It reads all mutable values exclusively through refs.
    const doStartRecognition = useCallback(() => {
        if (!isListeningRef.current) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatusText('Browser does not support mic input');
            isListeningRef.current = false;
            setVoiceState('idle');
            return;
        }

        const lang = currentLangRef.current;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        if (lang.full) recognition.lang = lang.full;

        recognition.onstart = () => {
            setVoiceState('listening');
            setStatusText(`Listening (${lang.desc})… speak now`);
        };

        recognition.onresult = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            let interim = '';
            let finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) finalChunk += r[0].transcript + ' ';
                else interim += r[0].transcript;
            }
            if (finalChunk) {
                finalTextRef.current = (finalTextRef.current + finalChunk).trimStart();
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }
            if (finalTextRef.current.trim()) {
                silenceTimerRef.current = setTimeout(() => sendFnRef.current(), 2000);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('[Mic] error:', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                // Hard stop — user denied permission
                isListeningRef.current = false;
                setVoiceState('idle');
                setStatusText('Mic permission denied — check browser settings');
            }
            // For 'no-speech', 'network', 'audio-capture': onend will handle restart
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            if (!isListeningRef.current) return; // We intentionally stopped — don't restart

            // Restart after a short delay (gives Chrome time to release the mic handle)
            setTimeout(() => {
                if (isListeningRef.current) doStartRecognition();
            }, 300);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            // Thrown if another instance is already running — safe to ignore
            console.warn('[Mic] start() threw (likely already running):', e);
            // Try again after a bit
            setTimeout(() => { if (isListeningRef.current) doStartRecognition(); }, 500);
        }
    }, []); // ← EMPTY DEPS intentional: all state is read through refs

    // ─── SEND TRANSCRIPT ─────────────────────────────────────────────────────
    const sendCurrentTranscript = useCallback(() => {
        const text = finalTextRef.current.trim();
        if (!text) return;

        // Stop listening before we hand off to AI
        isListeningRef.current = false;
        if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

        setTranscript(text);
        setInterimTranscript('');
        setVoiceState('thinking');
        setStatusText('Processing…');
        finalTextRef.current = '';
        onSendMessage(text);
    }, [onSendMessage]);

    // Keep sendFnRef in sync so onresult always calls the latest version
    useEffect(() => { sendFnRef.current = sendCurrentTranscript; }, [sendCurrentTranscript]);

    // ─── STOP LISTENING ───────────────────────────────────────────────────────
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    }, []);

    // ─── START LISTENING ──────────────────────────────────────────────────────
    const startListening = useCallback(() => {
        // Stop any playing audio (don't cancel speechSynthesis — can interfere with mic on Safari)
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if ((window as any).responsiveVoice) (window as any).responsiveVoice.cancel();

        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');
        isListeningRef.current = true;
        doStartRecognition();
    }, [doStartRecognition]);

    // ─── STOP SPEAKING ────────────────────────────────────────────────────────
    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if ((window as any).responsiveVoice) {
            (window as any).responsiveVoice.cancel();
        } else {
            window.speechSynthesis.cancel();
        }
    }, []);

    // ─── SPEAK TEXT ───────────────────────────────────────────────────────────
    const speakText = useCallback(async (text: string, onDone?: () => void) => {
        if (isMutedRef.current || !text.trim()) { onDone?.(); return; }
        stopSpeaking();
        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking…');

        // 1. Try Gemini TTS (key injected by Vite at build time)
        try {
            const geminiKey = (typeof __GEMINI_KEY__ !== 'undefined' && __GEMINI_KEY__) || '';
            if (geminiKey) {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: `Say the following out loud: ${clean}` }] }],
                            generationConfig: {
                                responseModalities: ['AUDIO'],
                                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                            }
                        })
                    }
                );

                if (res.ok) {
                    const data = await res.json();
                    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (b64) {
                        const src = createWavBlob(b64, 24000);
                        const audio = new Audio(src);
                        audioRef.current = audio;
                        audio.onended = () => { URL.revokeObjectURL(src); audioRef.current = null; onDone?.(); };
                        audio.onerror = () => { URL.revokeObjectURL(src); audioRef.current = null; onDone?.(); };
                        await audio.play();
                        return;
                    }
                }
            }
        } catch (err) {
            console.warn('[TTS] Gemini failed, using fallback:', err);
        }

        // 2. Fallback: ResponsiveVoice
        const voiceProfile = currentLangRef.current.code === 'id' ? 'Indonesian Female' : 'US English Female';
        if ((window as any).responsiveVoice) {
            (window as any).responsiveVoice.speak(clean, voiceProfile, {
                pitch: 1, rate: 1, volume: 1,
                onend: () => onDone?.(),
                onerror: () => onDone?.(),
            });
            return;
        }

        // 3. Last resort: native SpeechSynthesis
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 0.92;
        utter.onend = () => onDone?.();
        utter.onerror = () => onDone?.();
        window.speechSynthesis.speak(utter);
    }, [stopSpeaking]);

    // ─── REACT TO AI RESPONSE ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isAILoading && lastAIMessage && lastAIMessage !== spokenMessageRef.current) {
            spokenMessageRef.current = lastAIMessage;
            speakText(lastAIMessage, () => {
                setTranscript('');
                setTimeout(() => startListening(), 400);
            });
        }
    }, [isAILoading, lastAIMessage, speakText, startListening]);

    // ─── CLEANUP ON UNMOUNT ───────────────────────────────────────────────────
    useEffect(() => {
        return () => { stopListening(); stopSpeaking(); };
    }, []);

    // ─── UI HANDLERS ──────────────────────────────────────────────────────────
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
            startListening();
        } else if (voiceState === 'idle' || voiceState === 'thinking') {
            startListening();
        }
    };

    const cycleLang = () => {
        const next = (langIdx + 1) % LANG_OPTIONS.length;
        setLangIdx(next);
        setCurrentLang(LANG_OPTIONS[next]);
        currentLangRef.current = LANG_OPTIONS[next]; // sync ref immediately
        if (voiceState === 'listening') {
            stopListening();
            isListeningRef.current = true;
            setTimeout(() => doStartRecognition(), 200);
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

    // ─── STYLES ───────────────────────────────────────────────────────────────
    const orbColors = {
        idle: { ring: 'border-white/10', glow: '', core: 'bg-white/10' },
        listening: { ring: 'border-green-500/40', glow: 'shadow-[0_0_60px_rgba(34,197,94,0.2)]', core: 'bg-green-500/20' },
        thinking: { ring: 'border-amber-500/40', glow: 'shadow-[0_0_60px_rgba(245,158,11,0.2)]', core: 'bg-amber-500/20' },
        speaking: { ring: 'border-blue-500/40', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.2)]', core: 'bg-blue-500/20' },
    };
    const orb = orbColors[voiceState];
    const barColor = { idle: 'bg-white/20', listening: 'bg-green-400', thinking: 'bg-amber-400', speaking: 'bg-blue-400' }[voiceState];

    return (
        <>
            <style>{`
                @keyframes soundBar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
                @keyframes thinkDot { 0%,80%,100% { transform:scale(0.5);opacity:0.3; } 40% { transform:scale(1);opacity:1; } }
            `}</style>

            <div className="fixed inset-0 z-[9999] bg-[#050505]/98 backdrop-blur-2xl flex flex-col items-center justify-between py-12 px-6">

                {/* Top bar */}
                <div className="w-full max-w-sm flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/30 tracking-[0.2em] uppercase">Voice Mode</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={cycleLang}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/50 hover:text-white hover:border-white/20 transition-all"
                            title={`Switch language (currently ${currentLang.desc})`}
                        >
                            <Languages size={12} />
                            {currentLang.label}
                        </button>
                        <button
                            onClick={() => { setIsMuted(v => !v); if (!isMuted) stopSpeaking(); }}
                            className={`p-2 rounded-lg border transition-all ${isMuted ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'}`}
                            title={isMuted ? 'Unmute AI' : 'Mute AI'}
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <button
                            onClick={() => { stopListening(); stopSpeaking(); onClose(); }}
                            className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Center */}
                <div className="flex flex-col items-center gap-10 flex-1 justify-center w-full max-w-sm">
                    {/* Orb */}
                    <div
                        onClick={toggleListening}
                        className={`relative w-40 h-40 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-700 select-none ${orb.ring} ${orb.glow} ${orb.core}`}
                    >
                        {(voiceState === 'listening' || voiceState === 'speaking') && (
                            <span
                                className={`absolute inset-[-12px] rounded-full border ${voiceState === 'listening' ? 'border-green-500/20' : 'border-blue-500/20'} animate-ping`}
                                style={{ animationDuration: '1.5s' }}
                            />
                        )}
                        <div className="flex flex-col items-center gap-3">
                            <SoundBars active={voiceState === 'listening' || voiceState === 'speaking'} color={barColor} />
                            {voiceState === 'thinking' && <ThinkingDots />}
                        </div>
                        {voiceState === 'idle' && <Mic size={36} className="text-white/30" />}
                    </div>

                    {/* Status */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-white/50 font-medium">{statusText}</p>
                        {voiceState === 'listening' && (
                            <p className="text-xs text-white/20">Pause 2s to auto-send · tap orb to send now</p>
                        )}
                        {voiceState === 'speaking' && (
                            <p className="text-xs text-white/20">Tap orb to interrupt</p>
                        )}
                    </div>

                    {/* Transcript */}
                    <div className="w-full min-h-[72px] flex items-center justify-center px-4">
                        {transcript && voiceState !== 'listening' && (
                            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4">
                                <p className="text-white/80 text-sm leading-relaxed text-center">"{transcript}"</p>
                            </div>
                        )}
                        {(interimTranscript || (voiceState === 'listening' && finalTextRef.current)) && (
                            <div className="w-full text-center space-y-1">
                                {finalTextRef.current && (
                                    <p className="text-white/70 text-sm leading-relaxed">"{finalTextRef.current}"</p>
                                )}
                                {interimTranscript && (
                                    <p className="text-white/30 text-sm italic">{interimTranscript}…</p>
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
