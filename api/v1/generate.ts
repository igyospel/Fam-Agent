/**
 * /api/v1/generate.ts
 * 
 * Secure Smart Dual-Router (Groq + Gemini/OpenRouter)
 * - Text-only: Routes to Groq (Llama 3.3, super fast, 14.4k limits/day)
 * - Images/Documents: Routes to Gemini, falls back to OpenRouter (Nvidia Nemotron Vision Free)
 * 
 * 100% Free
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
].filter(Boolean) as string[];

let geminiKeyIndex = 0;
function getNextGeminiKey(): string {
    const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
    geminiKeyIndex++;
    return key;
}

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages, systemInstruction, stream = true } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages array' });

    const hasImages = messages.some((m: any) =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image' || c.type === 'image_url')
    );

    // ============================================
    // ROUTE 1: VISION/DOCUMENTS -> OPENROUTER (Nvidia)
    // ============================================
    if (hasImages) {
        if (!OPENROUTER_KEY) return res.status(500).json({ error: 'OpenRouter Key missing on server' });

        const openRouterMessages = messages.map((m: any) => {
            if (Array.isArray(m.content)) {
                return {
                    ...m,
                    content: m.content.map((part: any) => {
                        if (part.type === 'image' || part.type === 'image_url') {
                            return {
                                type: 'image_url',
                                image_url: { url: part.data ? `data:${part.mimeType || 'image/jpeg'};base64,${part.data}` : part.image_url?.url }
                            };
                        }
                        return part;
                    })
                };
            }
            return m;
        });

        if (systemInstruction) {
            openRouterMessages.unshift({ role: 'system', content: systemInstruction });
        }

        try {
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_KEY}`
                },
                body: JSON.stringify({
                    model: 'openrouter/free',
                    messages: openRouterMessages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 8192
                })
            });

            if (orRes.ok) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Route', 'openrouter-vision');

                const reader = orRes.body?.getReader();
                if (reader) {
                    const decoder = new TextDecoder();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(decoder.decode(value, { stream: true }));
                    }
                    return res.end();
                }
            }
            console.error('[Proxy] OpenRouter request failed! Status:', orRes.status);
            return res.status(orRes.status).json({ error: 'Vision API Error' });
        } catch (err) {
            console.error('[Proxy] OpenRouter exception:', err);
            return res.status(500).json({ error: 'Server exception on Vision route' });
        }
    }

    // ============================================
    // ROUTE 2: TEXT ONLY -> GROQ API (Llama 3.3)
    // ============================================
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API Key not configured on Vercel.' });

    const groqMessages = messages.map((m: any) => {
        if (Array.isArray(m.content)) {
            const textParts = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text);
            return { role: m.role, content: textParts.join('\n') };
        }
        return m;
    });

    if (systemInstruction) {
        groqMessages.unshift({ role: 'system', content: systemInstruction });
    }

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: groqMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        if (!groqRes.ok) {
            return res.status(groqRes.status).json({ error: 'Groq API Error', detail: await groqRes.text() });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Route', 'groq-text');

        const reader = groqRes.body?.getReader();
        if (!reader) throw new Error('No Groq response body');
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
        return res.end();

    } catch (err: any) {
        return res.status(500).json({ error: 'Server exception', detail: err.message });
    }
}
