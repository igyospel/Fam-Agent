/**
 * /api/v1/tts.ts — Natural AI Text-to-Speech Proxy
 *
 * Priority chain:
 * 1. Gemini 2.0 Flash TTS  (free, uses existing GEMINI_KEY — very natural Google AI voice)
 * 2. ElevenLabs             (optional upgrade, set ELEVENLABS_API_KEY for premium voices)
 * 3. 503 → client falls back to browser SpeechSynthesis
 */

const GEMINI_KEY = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2 || process.env.GEMINI_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// ── Gemini TTS config ──────────────────────────────────────────────────────
// Verified working with AI Studio free keys (AIzaSy...)
// Available voices: Zephyr · Puck · Charon · Kore · Fenrir · Aoede · Leda · Orus
const GEMINI_VOICE = 'Kore';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-tts'; // dedicated TTS model — verified ✓

// ── ElevenLabs config (if ELEVENLABS_API_KEY is set) ─────────────────────
const EL_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — calm, professional
const EL_MODEL = 'eleven_multilingual_v2'; // Supports ID + EN

// ── Helpers ────────────────────────────────────────────────────────────────

async function ttsViaGemini(text: string): Promise<Buffer | null> {
    if (!GEMINI_KEY) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    const body = {
        // The dedicated TTS model requires this phrasing to output audio (not text)
        contents: [{ role: 'user', parts: [{ text: `Say the following out loud: ${text}` }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: GEMINI_VOICE }
                }
            }
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        console.warn('[TTS/Gemini] Error:', res.status, await res.text().catch(() => ''));
        return null;
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) {
        console.warn('[TTS/Gemini] No audio data in response');
        return null;
    }

    // Gemini returns base64-encoded audio (WAV or PCM)
    const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
    return audioBuffer;
}

async function ttsViaElevenLabs(text: string): Promise<Buffer | null> {
    if (!ELEVENLABS_API_KEY) return null;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
            text: text.slice(0, 3000),
            model_id: EL_MODEL,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
            }
        })
    });

    if (!res.ok) {
        console.warn('[TTS/ElevenLabs] Error:', res.status);
        return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text' });
    }

    // Trim to avoid excessive API usage
    const trimmedText = text.trim().slice(0, 2000);

    // 1. Try Gemini TTS (free, natural Google AI voice)
    try {
        const geminiAudio = await ttsViaGemini(trimmedText);
        if (geminiAudio) {
            console.log(`[TTS] Gemini (${GEMINI_VOICE}) → ${geminiAudio.length} bytes`);
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('X-TTS-Provider', `gemini/${GEMINI_VOICE}`);
            return res.end(geminiAudio);
        }
    } catch (err) {
        console.warn('[TTS/Gemini] Exception:', err);
    }

    // 2. Try ElevenLabs TTS (optional premium upgrade)
    try {
        const elAudio = await ttsViaElevenLabs(trimmedText);
        if (elAudio) {
            console.log(`[TTS] ElevenLabs → ${elAudio.length} bytes`);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('X-TTS-Provider', 'elevenlabs');
            return res.end(elAudio);
        }
    } catch (err) {
        console.warn('[TTS/ElevenLabs] Exception:', err);
    }

    // 3. No TTS configured — client will use browser SpeechSynthesis fallback
    return res.status(503).json({
        error: 'TTS not available',
        hint: 'Set GEMINI_KEY or ELEVENLABS_API_KEY in environment variables'
    });
}
