/**
 * /api/v1/generate.ts
 *
 * Smart Routing Proxy — Tiered by user role:
 *
 * FREE users:
 *   - Text  → Groq (Llama 3.3 70B Versatile, ultra-fast)
 *   - Vision → NVIDIA (Llama 3.2 11B Vision Instruct, free)
 *
 * PREMIUM users (Pro / Dev):
 *   - Text  → OpenRouter: meta-llama/llama-3.3-70b-instruct (smarter reasoning)
 *   - Vision → OpenRouter: google/gemini-2.5-flash (superior vision + multimodal)
 *   - Web search → OpenRouter: perplexity/sonar (real-time web search)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const NVIDIA_KEY = process.env.VITE_GLM_API_KEY || '';

// Premium models via OpenRouter
const PREMIUM_MODEL_TEXT = 'meta-llama/llama-3.3-70b-instruct';
const PREMIUM_MODEL_VISION = 'google/gemini-2.5-flash-preview-04-17';
const PREMIUM_MODEL_SEARCH = 'perplexity/sonar';

// Helper: stream OpenRouter response to res
async function streamOpenRouter(
    model: string,
    messages: any[],
    res: any,
    temperature = 0.7,
    maxTokens = 8192
) {
    if (!OPENROUTER_KEY) {
        return res.status(500).json({ error: 'OpenRouter key not configured.' });
    }

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://agentarga.fun',
            'X-Title': 'Agent Arga'
        },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!orRes.ok) {
        const errText = await orRes.text();
        console.error('[Proxy] OpenRouter error:', orRes.status, errText);
        return res.status(orRes.status).json({ error: 'OpenRouter API Error', detail: errText });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Route', `openrouter-${model}`);

    const reader = orRes.body?.getReader();
    if (!reader) return res.status(500).json({ error: 'No response body from OpenRouter' });

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
            if (dataStr === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
            try {
                const parsed = JSON.parse(dataStr);
                const text = parsed?.choices?.[0]?.delta?.content;
                if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
            } catch { }
        }
    }
    res.write('data: [DONE]\n\n');
    return res.end();
}

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages, systemInstruction, stream = true, isPremiumUser = false, webSearch = false } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages array' });

    // hasImages = actual image bytes/URL (needs vision model)
    // hasDocs   = PDF/doc text already extracted as plain text (needs reasoning model, NOT vision)
    const hasImages = messages.some((m: any) =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image' || c.type === 'image_url')
    );
    const hasDocs = messages.some((m: any) =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'text' && typeof c.text === 'string' && c.text.startsWith('[File:'))
    );

    console.log(`[Proxy] isPremium=${isPremiumUser} | hasImages=${hasImages} | hasDocs=${hasDocs} | webSearch=${webSearch}`);

    // ================================================================
    // PREMIUM ROUTING — uses OpenRouter with top-tier models
    // ================================================================
    if (isPremiumUser && OPENROUTER_KEY) {
        // Build OpenRouter-compatible messages
        const orMessages: any[] = [];

        if (systemInstruction) {
            orMessages.push({ role: 'system', content: systemInstruction });
        }

        // Normalize messages: convert our proxy image format → OpenRouter image_url format
        for (const m of messages) {
            if (Array.isArray(m.content)) {
                const normalizedContent = m.content.map((part: any) => {
                    if (part.type === 'image') {
                        return {
                            type: 'image_url',
                            image_url: { url: `data:${part.mimeType || 'image/jpeg'};base64,${part.data}` }
                        };
                    }
                    return part;
                });
                orMessages.push({ role: m.role, content: normalizedContent });
            } else {
                orMessages.push({ role: m.role, content: m.content });
            }
        }

        let premiumModel: string;
        let temperature = 0.7;
        let maxTokens = 8192;

        if (hasImages) {
            // Has actual image → Gemini 2.5 Flash (best vision + multimodal)
            premiumModel = PREMIUM_MODEL_VISION;
            maxTokens = 8192;
            console.log(`[Proxy] PREMIUM Vision → ${premiumModel}`);
        } else if (webSearch) {
            // Web search → Perplexity Sonar (real-time)
            premiumModel = PREMIUM_MODEL_SEARCH;
            temperature = 0.2;
            maxTokens = 4096;
            console.log(`[Proxy] PREMIUM WebSearch → ${premiumModel}`);
        } else {
            // Text / PDF docs → Llama 3.3 70B Instruct (best reasoning, long detailed answers)
            // PDFs are already extracted as text — no vision needed, reasoning wins here
            premiumModel = PREMIUM_MODEL_TEXT;
            maxTokens = hasDocs ? 16384 : 8192; // Give more tokens for document analysis
            console.log(`[Proxy] PREMIUM ${hasDocs ? 'Docs/PDF' : 'Text'} → ${premiumModel} (max_tokens=${maxTokens})`);
        }

        return streamOpenRouter(premiumModel, orMessages, res, temperature, maxTokens);
    }

    // ================================================================
    // FREE ROUTING
    // ================================================================

    // ---- ROUTE 1: VISION → NVIDIA (Llama 3.2 11B Vision) ----
    if (hasImages) {
        if (!NVIDIA_KEY) return res.status(500).json({ error: 'Nvidia API Key missing' });

        const nvidiaMessages = messages.map((m: any) => {
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
            nvidiaMessages.unshift({ role: 'system', content: systemInstruction });
        }

        try {
            const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${NVIDIA_KEY}`
                },
                body: JSON.stringify({
                    model: 'meta/llama-3.2-11b-vision-instruct',
                    messages: nvidiaMessages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });

            if (nvRes.ok) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Route', 'nvidia-vision-free');

                const reader = nvRes.body?.getReader();
                if (reader) {
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
                            if (dataStr === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
                            try {
                                const parsed = JSON.parse(dataStr);
                                const text = parsed?.choices?.[0]?.delta?.content;
                                if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                            } catch { }
                        }
                    }
                    res.write('data: [DONE]\n\n');
                    return res.end();
                }
            }
            console.error('[Proxy] NVIDIA Vision failed:', nvRes.status);
            return res.status(nvRes.status).json({ error: 'Vision API Error' });
        } catch (err) {
            console.error('[Proxy] NVIDIA exception:', err);
            return res.status(500).json({ error: 'Server exception on Vision route' });
        }
    }

    // ---- ROUTE 2: TEXT → GROQ (Llama 3.3 70B Versatile) ----
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API Key not configured.' });

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
        res.setHeader('X-Route', 'groq-text-free');

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
