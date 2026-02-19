import { Message, Attachment } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// MiniMax: 1M ctx, vision support
const MODEL_DEFAULT = "minimax/minimax-01";
// Perplexity Sonar: real-time web search built-in
const MODEL_WEB_SEARCH = "perplexity/sonar";

export async function* streamLLMResponse(
    history: Message[],
    currentMessageText: string,
    attachments: Attachment[],
    webSearch: boolean = false
) {
    if (!API_KEY) {
        throw new Error("OpenRouter API Key tidak ditemukan. Pastikan VITE_OPENROUTER_API_KEY sudah diisi di .env.local");
    }

    const hasImages = attachments.some(att => att.mimeType.startsWith("image/"));
    const hasDocs = attachments.some(att => !att.mimeType.startsWith("image/"));

    // Perplexity Sonar doesn't support vision — fallback to MiniMax if there are images
    const modelId = (webSearch && !hasImages) ? MODEL_WEB_SEARCH : MODEL_DEFAULT;

    console.log(`[LLM] Using model: ${modelId} | webSearch: ${webSearch}`);

    try {
        // System prompt + history in OpenAI-compatible format
        const messages: any[] = [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            ...history
                .filter(m => !m.isError && m.id !== 'system-init')
                .map(m => ({
                    role: m.role === 'model' ? 'assistant' : 'user',
                    content: m.text
                }))
        ];

        // Build current user message content
        let userContent: any;

        if (hasImages) {
            const parts: any[] = [];

            if (hasDocs) {
                const docTexts = attachments
                    .filter(att => !att.mimeType.startsWith("image/"))
                    .map(att => att.textContent
                        ? `[Dokumen: ${att.file.name}]\n${att.textContent}`
                        : `[Dokumen: ${att.file.name} - tidak dapat membaca konten]`)
                    .join("\n\n");
                if (docTexts) parts.push({ type: "text", text: docTexts });
            }

            if (currentMessageText) {
                parts.push({ type: "text", text: currentMessageText });
            }

            attachments
                .filter(att => att.mimeType.startsWith("image/"))
                .forEach(att => {
                    const base64Url = att.base64.startsWith('data:')
                        ? att.base64
                        : `data:${att.mimeType};base64,${att.base64}`;
                    parts.push({
                        type: "image_url",
                        image_url: { url: base64Url }
                    });
                });

            userContent = parts;
        } else if (hasDocs) {
            const docTexts = attachments
                .map(att => att.textContent
                    ? `[Dokumen: ${att.file.name}]\n${att.textContent}`
                    : `[Dokumen: ${att.file.name} - tidak dapat membaca konten]`)
                .join("\n\n");
            userContent = docTexts
                ? `${docTexts}\n\n${currentMessageText}`
                : currentMessageText;
        } else {
            userContent = currentMessageText;
        }

        messages.push({ role: 'user', content: userContent });

        const body: any = {
            model: modelId,
            messages,
            stream: true,
            temperature: webSearch ? 0.2 : 0.7,
            top_p: 0.9,
            max_tokens: 4096
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
                "HTTP-Referer": "https://agentarga.fun",
                "X-Title": "Agent Arga",
                "Accept": "text/event-stream"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `API Error ${response.status}`;
            try {
                const errJson = JSON.parse(errorText);
                errorMsg = errJson?.error?.message || errorMsg;
            } catch {
                errorMsg = errorText || errorMsg;
            }
            throw new Error(errorMsg);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

                if (trimmedLine.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(trimmedLine.slice(6));
                        const delta = data.choices?.[0]?.delta?.content;
                        if (delta) yield delta;
                    } catch (e) {
                        console.warn("Error parsing stream chunk:", e);
                    }
                }
            }
        }

    } catch (error) {
        console.error("OpenRouter API Error:", error);
        throw error;
    }
}
