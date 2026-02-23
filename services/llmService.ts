import { Message, Attachment } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { streamGeminiResponse } from "./geminiService";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Gemini 2.5 Flash: Very fast, super cheap, great vision and anime recognition
const MODEL_DEFAULT = "google/gemini-2.5-flash";
// Perplexity Sonar: real-time web search built-in
const MODEL_WEB_SEARCH = "perplexity/sonar";

export async function* streamLLMResponse(
    history: Message[],
    currentMessageText: string,
    attachments: Attachment[],
    webSearch: boolean = false
) {
    const hasImages = attachments.some(att => att.mimeType.startsWith("image/"));
    const hasDocs = attachments.some(att => !att.mimeType.startsWith("image/"));

    // If OpenRouter API Key is missing:
    // 1. Fallback to Google AI Studio Free Tier (Gemini) if there are images.
    // 2. Fallback to 100% FREE NO-KEY proxy (Pollinations AI) if text only.
    if (!API_KEY) {
        if (hasImages && import.meta.env.VITE_GEMINI_API_KEY) {
            console.log("[LLM] Route: Direct Free Gemini API (Image detected, no OpenRouter Key)");
            return yield* streamGeminiResponse(history, currentMessageText, attachments);
        } else {
            console.warn("[WARNING] No OpenRouter API Key found. Falling back to FREE public community API (Pollinations.ai).");
            return yield* streamFreeResponse(history, currentMessageText, attachments);
        }
    }

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

/**
 * Fallback AI function that uses Pollinations.ai (100% Free, No API Key required)
 */
async function* streamFreeResponse(
    history: Message[],
    currentMessageText: string,
    attachments: Attachment[]
) {
    // Build context
    let prompt = `${SYSTEM_INSTRUCTION}\n\n`;

    // Add history
    for (const m of history.filter(m => !m.isError && m.id !== 'system-init')) {
        prompt += `${m.role === 'model' ? 'Assistant' : 'User'}: ${m.text}\n`;
    }

    // Add current context
    const hasDocs = attachments.some(att => !att.mimeType.startsWith("image/"));
    if (hasDocs) {
        const docTexts = attachments
            .filter(att => !att.mimeType.startsWith("image/"))
            .map(att => att.textContent
                ? `[Document: ${att.file.name}]\n${att.textContent}`
                : "")
            .join("\n\n");
        if (docTexts) prompt += `\nDocumentation Context:\n${docTexts}\n\n`;
    }

    prompt += `User: ${currentMessageText}\nAssistant:`;

    try {
        // Pollinations text endpoint is just a GET/POST that returns full text, not a stream
        // For a stream simulation, we will fetch the full text and yield it in chunks
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "openai", // Uses community proxy
                seed: Math.floor(Math.random() * 1000000)
            })
        });

        if (!response.ok) {
            throw new Error(`Free API Error: ${response.status}`);
        }

        const fullText = await response.text();

        // Simulate streaming effect for UI consistency
        const chunkSize = 5;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            yield fullText.slice(i, i + chunkSize);
            await new Promise(resolve => setTimeout(resolve, 20)); // Fake stream delay
        }

    } catch (err: any) {
        yield "\n\n*(Error: The free community API is currently overloaded or blocked by cross-origin policies. Please configure an API Key in Vercel/Environment Variables for reliable access).*";
        console.error("Free API Error:", err);
    }
}
