/**
 * /api/v1/generate.ts
 * 
 * Secure Serverless AI Proxy for Agent Arga
 * - All Gemini API Keys are kept SERVER-SIDE only (never exposed to browser)
 * - Auto rotating keys: if one key hits rate limit (429), tries next one
 * - Supports streaming SSE (Server-Sent Events) for real-time chat
 */

// ============================================================
// KEY POOL — Add as many keys as needed via Vercel env vars
// ============================================================
const GEMINI_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
].filter(Boolean) as string[];

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

// Simple in-memory round-robin index
// (resets on cold start, good enough for stateless serverless)
let geminiKeyIndex = 0;

function getNextGeminiKey(): string {
    const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
    geminiKeyIndex++;
    return key;
}

// ============================================================
// MODELS
// ============================================================
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, systemInstruction, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Missing messages array' });
    }

    if (GEMINI_KEYS.length === 0) {
        return res.status(500).json({ error: 'No Gemini API keys configured on server.' });
    }

    // Convert OpenAI-style messages to Gemini format
    const geminiContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(m.content)
            ? m.content.map((c: any) => c.type === 'text' ? { text: c.text } : { inlineData: { mimeType: c.mimeType, data: c.data } })
            : [{ text: m.content || '' }]
    }));

    // Try keys with retry on 429
    let lastError: any = null;
    for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
        const apiKey = getNextGeminiKey();
        const endpoint = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`;

        try {
            const geminiRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: geminiContents,
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (geminiRes.status === 429) {
                console.warn(`[KeyRotator] Key ${attempt + 1} hit rate limit (429), trying next key...`);
                lastError = { status: 429, message: 'Rate limit exceeded' };
                continue; // 🔄 Try next key
            }

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error(`[KeyRotator] Key ${attempt + 1} returned ${geminiRes.status}:`, errText);
                lastError = { status: geminiRes.status, message: errText };
                continue;
            }

            // ✅ Key worked! Stream the response back
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Key-Used', `key_${attempt + 1}`); // For debugging

            const reader = geminiRes.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const dataStr = trimmed.slice(6);
                    if (dataStr === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(dataStr);
                        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            // Re-emit as standard SSE with OpenAI-compatible format
                            const chunk = JSON.stringify({
                                choices: [{ delta: { content: text } }]
                            });
                            res.write(`data: ${chunk}\n\n`);
                        }
                    } catch {
                        // Skip malformed chunks
                    }
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
            return;

        } catch (err: any) {
            console.error(`[KeyRotator] Key ${attempt + 1} threw error:`, err.message);
            lastError = err;
        }
    }

    // All keys exhausted
    console.error('[KeyRotator] All Gemini keys exhausted!');
    res.status(503).json({
        error: 'All API keys are currently rate limited. Please try again in a minute.',
        detail: lastError?.message
    });
}
