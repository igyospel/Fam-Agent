export default async function handler(req: any, res: any) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    try {
        let fetchUrl = url;

        // Use Jina AI reader API to bypass Cloudflare/bot protections and extract main markdown content
        if (!url.includes('r.jina.ai')) {
            fetchUrl = `https://r.jina.ai/${url}`;
        }

        const response = await fetch(fetchUrl, {
            headers: {
                // Mimic a standard browser as fallback if jina fails internally, plus tell Jina we want markdown
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown'
            }
        });

        if (!response.ok) {
            throw new Error(`Scraper API Error: ${response.status}`);
        }

        const data = await response.text();
        res.status(200).send(data);
    } catch (error: any) {
        console.error("Scrape Error:", error);
        res.status(500).json({ error: `Failed to scrape URL: ${error.message}` });
    }
}
