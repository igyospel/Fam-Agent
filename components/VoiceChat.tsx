import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Square, Volume2, VolumeX, RotateCcw, Languages } from 'lucide-react';

// Vite injects this at build time via `define` in vite.config.ts
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

function createWavBlob(base64Data: string, sampleRate: number = 24000): string {
    const raw = atob(base64Data);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    const buffer = new ArrayBuffer(44 + rawLength);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 1380533830, false); // 'RIFF'
    view.setUint32(4, 36 + rawLength, true); // length
    view.setUint32(8, 1463899717, false); // 'WAVE'

    // fmt sub-chunk
    view.setUint32(12, 1718449184, false); // 'fmt '
    view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, 1, true); // num channels (1)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data sub-chunk
    view.setUint32(36, 1684108385, false); // 'data'
    view.setUint32(40, rawLength, true); // data length

    // Write PCM data
    const pcmData = new Uint8Array(buffer, 44);
    pcmData.set(array);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isListeningRef = useRef(false); // tracks desired listening state — avoids stale closure

    const stopListening = useCallback(() => {
        isListeningRef.current = false; // signal that we WANT to be stopped
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
        // Stop ElevenLabs audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        // Stop browser TTS fallback and ResponsiveVoice
        if ((window as any).responsiveVoice) {
            (window as any).responsiveVoice.cancel();
        } else {
            window.speechSynthesis.cancel();
        }
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
        if (!SpeechRecognition) {
            setStatusText('Browser does not support voice input');
            return;
        }

        // Stop any currently playing audio before re-listening, but don't cancel speechSynthesis
        // (that can interfere with mic init on some browsers)
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');

        isListeningRef.current = true; // signal that we WANT to be listening

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
            console.error('[VoiceChat] Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                setStatusText('No speech detected...');
            } else if (event.error !== 'aborted') {
                setVoiceState('idle');
                setStatusText(`Mic error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            // Use isListeningRef (NOT stale voiceState) to check if we still want to be listening
            // This fixes the React stale closure bug — voiceState captured at creation time was 'idle'
            if (isListeningRef.current) {
                setTimeout(() => {
                    try {
                        startListening(lang);
                    } catch (e) {
                        console.error('Failed to auto-restart recognition:', e);
                    }
                }, 50);
            }
            recognitionRef.current = null;
        };

        try {
            recognitionRef.current = recognition;
            recognition.start();
        } catch (e) {
            console.error('[VoiceChat] Could not start speech recognition directly:', e);
            setStatusText('Browser mic start blocked');
            setVoiceState('idle');
        }
    }, [sendCurrentTranscript]);

    const speakText = useCallback(async (text: string, onDone?: () => void) => {
        if (isMuted || !text.trim()) { onDone?.(); return; }
        stopSpeaking();
        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking...');

        // Try Gemini TTS — key injected by Vite define (works in dev + mobile production)
        try {
            const geminiKey = (typeof __GEMINI_KEY__ !== 'undefined' && __GEMINI_KEY__) || import.meta.env?.VITE_GEMINI_KEY_1 || '';
            if (geminiKey) {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: `Say the following out loud: ${clean}` }] }],
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

                    if (audioBase64) {
                        const audioSrc = createWavBlob(audioBase64, 24000);
                        const audio = new Audio(audioSrc);
                        audioRef.current = audio;
                        audio.playbackRate = 1.0;
                        audio.onended = () => {
                            URL.revokeObjectURL(audioSrc);
                            audioRef.current = null;
                            onDone?.();
                        };
                        audio.onerror = () => {
                            URL.revokeObjectURL(audioSrc);
                            audioRef.current = null;
                            onDone?.();
                        };
                        await audio.play();
                        return; // Successfully played natural voice!
                    }
                }
            }
        } catch (err) {
            console.warn('[TTS] Direct Gemini TTS failed, using browser fallback:', err);
        }

        // --- Fallback: ResponsiveVoice ---
        const voiceProfile = currentLang.code === 'id' ? 'Indonesian Female' :
            currentLang.code === 'en' ? 'US English Female' :
                'Indonesian Female'; // default auto to Indonesian

        if ((window as any).responsiveVoice) {
            (window as any).responsiveVoice.speak(clean, voiceProfile, {
                pitch: 1,
                rate: 1,
                volume: 1,
                onend: () => onDone?.(),
                onerror: () => onDone?.()
            });
        } else {
            // Native fallback if script not loaded
            const utter = new SpeechSynthesisUtterance(clean);
            utter.rate = 0.92;
            utter.onend = () => onDone?.();
            utter.onerror = () => onDone?.();
            window.speechSynthesis.speak(utter);
        }
    }, [isMuted, stopSpeaking, currentLang]);

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
