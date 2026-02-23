export const extractUrls = (text: string): string[] => {
    // Regex for matching URLs, excluding common markdown/html wrapping tokens that might accidentally be merged
    const urlRegex = /(https?:\/\/[^\s<)\]]+)/g;
    return text.match(urlRegex) || [];
};

export const fetchUrlContent = async (url: string): Promise<string> => {
    try {
        // We use our serverless function to bypass CORS and apply Jina AI Markdown extraction 
        const proxyUrl = `/api/v1/scrape?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`Failed to scrape (Status: ${response.status})`);
        }

        const data = await response.text();
        return `[Scraped Content from ${url}]:\n\n${data.substring(0, 15000)}`; // limit reading to 15k chars to save context window
    } catch (e) {
        console.error(`Error scraping ${url}:`, e);
        return `[Notice: Agent Arga failed to read content from ${url} due to site security blocks/CORS.]`;
    }
};
