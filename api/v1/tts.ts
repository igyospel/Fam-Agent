/**
 * /api/v1/tts.ts
 *
 * Text-to-Speech proxy using ElevenLabs (natural AI voice)
 * - Primary: ElevenLabs eleven_multilingual_v2 (supports ID + EN)
 * - Falls back to 400 error if key not configured (client falls back to browser TTS)
 *
 * Add ELEVENLABS_API_KEY to Vercel environment variables to enable.
 * Free tier: 10,000 characters/month — https://elevenlabs.io
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// ElevenLabs voice IDs (pre-made, available on all accounts including free)
// Pick your preferred voice below:
const VOICES = {
    // Natural sounding voices
    rachel: '21m00Tcm4TlvDq8ikWAM',  // calm, professional female
    adam: 'pNInz6obpgDQGcFmaJgB',   // deep natural male
    antoni: 'ErXwobaYiN019PkySvjV',   // well-rounded male
    elli: 'MF3mGyEYCl7XYWbV9V6O',   // upbeat, expressive female
    domi: 'AZnzlk1XvdvUeBnXmlld',   // strong, clear female
};

// Change this to pick a different voice
const SELECTED_VOICE = VOICES.rachel;

// ElevenLabs multilingual model — supports Indonesian, English, and many more
const MODEL_ID = 'eleven_multilingual_v2';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!ELEVENLABS_API_KEY) {
        return res.status(503).json({ error: 'TTS not configured. Add ELEVENLABS_API_KEY to Vercel env.' });
    }

    const { text, voiceId } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text' });
    }

    // Trim text to reasonable length (ElevenLabs charges per char)
    const trimmedText = text.slice(0, 3000);

    try {
        const voice = voiceId || SELECTED_VOICE;

        const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: trimmedText,
                model_id: MODEL_ID,
                voice_settings: {
                    stability: 0.5,          // 0-1, higher = more consistent
                    similarity_boost: 0.75,  // 0-1, higher = more like the voice clone
                    style: 0.5,              // 0-1, expressiveness
                    use_speaker_boost: true  // enhanced clarity
                }
            })
        });

        if (!elRes.ok) {
            const errText = await elRes.text();
            console.error('[TTS] ElevenLabs error:', elRes.status, errText);
            return res.status(elRes.status).json({ error: 'ElevenLabs TTS failed', detail: errText });
        }

        // Stream audio back to client
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-TTS-Provider', 'elevenlabs');

        const reader = elRes.body?.getReader();
        if (!reader) return res.status(500).json({ error: 'No audio stream' });

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
        }

        return res.end();

    } catch (err: any) {
        console.error('[TTS] Exception:', err);
        return res.status(500).json({ error: 'TTS server error', detail: err.message });
    }
}
