import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, RotateCcw, Languages, Square } from 'lucide-react';

// Injected by Vite at build time via vite.config.ts define
declare const __GEMINI_KEY__: string;
declare const __GROQ_KEY__: string;

interface VoiceChatProps {
    onClose: () => void;
    onSendMessage: (text: string) => void;
    lastAIMessage: string;
    isAILoading: boolean;
}

type VoiceState = 'idle' | 'recording' | 'thinking' | 'speaking';

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
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + rawLength, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, rawLength, true);
    new Uint8Array(buf, 44).set(pcm);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

const LANG_OPTIONS = [
    { code: 'id', label: 'ID', whisper: 'id', desc: 'Indonesia' },
    { code: 'en', label: 'EN', whisper: 'en', desc: 'English' },
    { code: 'auto', label: 'AUTO', whisper: undefined, desc: 'Auto detect' },
];

// Animated bars
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
    const [statusText, setStatusText] = useState('Tap the mic to start');
    const [isMuted, setIsMuted] = useState(false);
    const [langIdx, setLangIdx] = useState(0);
    const [currentLang, setCurrentLang] = useState(LANG_OPTIONS[0]);
    const [recordingSecs, setRecordingSecs] = useState(0);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const spokenMessageRef = useRef('');
    const isMutedRef = useRef(false);
    const currentLangRef = useRef(LANG_OPTIONS[0]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const maxTimerRef = useRef<NodeJS.Timeout | null>(null);
    const secondsRef = useRef(0);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { currentLangRef.current = currentLang; }, [currentLang]);

    // ── Stop stream / cleanup ─────────────────────────────────────────────────
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
        secondsRef.current = 0;
        setRecordingSecs(0);
    }, []);

    // ── Transcribe via Groq Whisper ───────────────────────────────────────────
    const transcribeAndSend = useCallback(async (blob: Blob) => {
        if (blob.size < 2000) {
            // Too small — probably silence
            setVoiceState('idle');
            setStatusText('No speech detected. Tap to try again.');
            return;
        }

        setVoiceState('thinking');
        setStatusText('Transcribing…');

        try {
            const groqKey = (typeof __GROQ_KEY__ !== 'undefined' && __GROQ_KEY__) || '';
            if (!groqKey) throw new Error('No Groq key configured');

            const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
            const formData = new FormData();
            formData.append('file', blob, `recording.${ext}`);
            formData.append('model', 'whisper-large-v3-turbo');
            const langCode = currentLangRef.current.whisper;
            if (langCode) formData.append('language', langCode);
            formData.append('response_format', 'json');

            const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqKey}` },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Groq Whisper ${res.status}: ${err}`);
            }

            const data = await res.json();
            const text = (data.text || '').trim();

            if (text) {
                setTranscript(text);
                setVoiceState('thinking');
                setStatusText('Processing…');
                onSendMessage(text);
            } else {
                setVoiceState('idle');
                setStatusText('No speech detected. Tap to try again.');
            }
        } catch (err) {
            console.error('[STT] Transcription failed:', err);
            setVoiceState('idle');
            setStatusText('Transcription failed. Tap to retry.');
        }
    }, [onSendMessage]);

    // ── Stop recording ────────────────────────────────────────────────────────
    const stopRecording = useCallback(() => {
        stopStream();
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'recording') {
            recorder.stop(); // triggers onstop → transcribeAndSend
        } else {
            setVoiceState('idle');
            setStatusText('Tap the mic to start');
        }
        mediaRecorderRef.current = null;
    }, [stopStream]);

    // ── Start recording ───────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        // Stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if ((window as any).responsiveVoice) (window as any).responsiveVoice.cancel();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                }
            });
            streamRef.current = stream;

            // Pick best supported MIME type
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
                .find(m => MediaRecorder.isTypeSupported(m)) || '';

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const mtype = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: mtype });
                chunksRef.current = [];
                stopStream();
                await transcribeAndSend(blob);
            };

            recorder.onerror = () => {
                stopStream();
                setVoiceState('idle');
                setStatusText('Recording error. Tap to retry.');
            };

            recorder.start(250); // collect chunks every 250ms
            mediaRecorderRef.current = recorder;

            setVoiceState('recording');
            setStatusText(`Recording (${currentLangRef.current.desc})… tap again to send`);
            secondsRef.current = 0;
            setRecordingSecs(0);

            // Tick timer for UI
            recordingTimerRef.current = setInterval(() => {
                secondsRef.current++;
                setRecordingSecs(secondsRef.current);
            }, 1000);

            // Max 60 seconds
            maxTimerRef.current = setTimeout(() => stopRecording(), 60000);

        } catch (err: any) {
            console.error('[Mic] getUserMedia failed:', err);
            setVoiceState('idle');
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatusText('Mic permission denied — allow mic in browser settings');
            } else {
                setStatusText(`Mic error: ${err.name}`);
            }
        }
    }, [stopStream, stopRecording, transcribeAndSend]);

    // ── TTS ───────────────────────────────────────────────────────────────────
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

    const speakText = useCallback(async (text: string, onDone?: () => void) => {
        if (isMutedRef.current || !text.trim()) { onDone?.(); return; }
        stopSpeaking();
        const clean = stripMarkdown(text);
        if (!clean.trim()) { onDone?.(); return; }

        setVoiceState('speaking');
        setStatusText('Agent Arga is speaking…');

        // 1. Gemini TTS
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
            console.warn('[TTS] Gemini failed:', err);
        }

        // 2. ResponsiveVoice fallback
        const voiceProfile = currentLangRef.current.code === 'id' ? 'Indonesian Female' : 'US English Female';
        if ((window as any).responsiveVoice) {
            (window as any).responsiveVoice.speak(clean, voiceProfile, {
                pitch: 1, rate: 1, volume: 1,
                onend: () => onDone?.(),
                onerror: () => onDone?.(),
            });
            return;
        }

        // 3. Native SpeechSynthesis last resort
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 0.92;
        utter.onend = () => onDone?.();
        utter.onerror = () => onDone?.();
        window.speechSynthesis.speak(utter);
    }, [stopSpeaking]);

    // ── React on AI response ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isAILoading && lastAIMessage && lastAIMessage !== spokenMessageRef.current) {
            spokenMessageRef.current = lastAIMessage;
            speakText(lastAIMessage, () => {
                setTranscript('');
                setVoiceState('idle');
                setStatusText('Tap the mic to speak');
            });
        }
    }, [isAILoading, lastAIMessage, speakText]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => { stopRecording(); stopSpeaking(); };
    }, []);

    // ── UI handlers ───────────────────────────────────────────────────────────
    const handleOrbClick = () => {
        if (voiceState === 'recording') {
            stopRecording();
        } else if (voiceState === 'speaking') {
            stopSpeaking();
            setVoiceState('idle');
            setStatusText('Tap the mic to speak');
        } else if (voiceState === 'idle') {
            startRecording();
        }
    };

    const cycleLang = () => {
        const next = (langIdx + 1) % LANG_OPTIONS.length;
        setLangIdx(next);
        setCurrentLang(LANG_OPTIONS[next]);
        currentLangRef.current = LANG_OPTIONS[next];
    };

    const handleReset = () => {
        stopRecording();
        stopSpeaking();
        setTranscript('');
        setVoiceState('idle');
        setStatusText('Tap the mic to start');
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const orbColors = {
        idle: { ring: 'border-white/10', glow: '', core: 'bg-white/10' },
        recording: { ring: 'border-red-500/60', glow: 'shadow-[0_0_60px_rgba(239,68,68,0.3)]', core: 'bg-red-500/20' },
        thinking: { ring: 'border-amber-500/40', glow: 'shadow-[0_0_60px_rgba(245,158,11,0.2)]', core: 'bg-amber-500/20' },
        speaking: { ring: 'border-blue-500/40', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.2)]', core: 'bg-blue-500/20' },
    };
    const orb = orbColors[voiceState];
    const barColor = { idle: 'bg-white/20', recording: 'bg-red-400', thinking: 'bg-amber-400', speaking: 'bg-blue-400' }[voiceState];

    return (
        <>
            <style>{`
                @keyframes soundBar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
                @keyframes thinkDot { 0%,80%,100% { transform:scale(0.5);opacity:0.3; } 40% { transform:scale(1);opacity:1; } }
                @keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
            `}</style>

            <div className="fixed inset-0 z-[9999] bg-[#050505]/98 backdrop-blur-2xl flex flex-col items-center justify-between py-12 px-6">

                {/* Top bar */}
                <div className="w-full max-w-sm flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/30 tracking-[0.2em] uppercase">Voice Mode</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={cycleLang}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/50 hover:text-white hover:border-white/20 transition-all"
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
                            onClick={() => { stopRecording(); stopSpeaking(); onClose(); }}
                            className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Center */}
                <div className="flex flex-col items-center gap-10 flex-1 justify-center w-full max-w-sm">

                    {/* Recording timer */}
                    {voiceState === 'recording' && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'recPulse 1s ease-in-out infinite' }} />
                            <span className="text-red-400 text-sm font-mono tabular-nums">
                                {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:{String(recordingSecs % 60).padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    {/* Orb */}
                    <div
                        onClick={handleOrbClick}
                        className={`relative w-40 h-40 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-500 select-none ${orb.ring} ${orb.glow} ${orb.core}`}
                    >
                        {(voiceState === 'recording' || voiceState === 'speaking') && (
                            <span
                                className={`absolute inset-[-12px] rounded-full border animate-ping ${voiceState === 'recording' ? 'border-red-500/30' : 'border-blue-500/20'}`}
                                style={{ animationDuration: '1.5s' }}
                            />
                        )}

                        <div className="flex flex-col items-center gap-3">
                            <SoundBars active={voiceState === 'recording' || voiceState === 'speaking'} color={barColor} />
                            {voiceState === 'thinking' && <ThinkingDots />}
                        </div>

                        {voiceState === 'idle' && <Mic size={36} className="text-white/30" />}
                        {voiceState === 'recording' && (
                            <Square size={28} className="text-red-400 absolute" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }} />
                        )}
                    </div>

                    {/* Status */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-white/50 font-medium">{statusText}</p>
                        {voiceState === 'recording' && (
                            <p className="text-xs text-white/20">Tap orb again to stop & send</p>
                        )}
                        {voiceState === 'speaking' && (
                            <p className="text-xs text-white/20">Tap orb to interrupt</p>
                        )}
                    </div>

                    {/* Transcript */}
                    <div className="w-full min-h-[60px] flex items-center justify-center px-4">
                        {transcript && (
                            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4">
                                <p className="text-white/80 text-sm leading-relaxed text-center">"{transcript}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom */}
                <div className="flex items-center gap-3 w-full max-w-sm justify-center">
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
