export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer sk-arga-')) {
        return new Response(JSON.stringify({
            error: { message: 'Invalid API Key. Must be a valid Agent Arga API Key starting with sk-arga-', type: 'invalid_request_error', code: 'invalid_api_key' }
        }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    try {
        const body = await request.json();
        const { messages, model = "google/gemini-2.5-flash", stream = false } = body;

        if (!messages) {
            return new Response(JSON.stringify({ error: { message: 'Messages array is required' } }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const openRouterKey = process.env.VITE_OPENROUTER_API_KEY;

        if (!openRouterKey) {
            return new Response(JSON.stringify({ error: { message: 'Server Configuration Error: Master API Key Not configured.' } }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Forward the request to OpenRouter using User's custom API Key simulation
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://agentarga.fun',
                'X-Title': 'Agent Arga Developer API',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: stream
            }),
        });

        if (stream) {
            return new Response(openRouterResponse.body, {
                status: openRouterResponse.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            });
        } else {
            const data = await openRouterResponse.json();
            return new Response(JSON.stringify(data), {
                status: openRouterResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

    } catch (err: any) {
        return new Response(JSON.stringify({ error: { message: err.message } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
