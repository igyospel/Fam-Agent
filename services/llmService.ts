import { Message, Attachment } from "../types";

const API_KEY = import.meta.env.VITE_GLM_API_KEY || "";
const API_URL = "https://api.us-west-2.modal.direct/v1/chat/completions";
const MODEL_ID = "zai-org/GLM-5-FP8";

export async function* streamLLMResponse(
    history: Message[],
    currentMessageText: string,
    attachments: Attachment[]
) {
    if (!API_KEY) {
        throw new Error("GLM API Key not found in environment variables");
    }

    try {
        // Transform history to OpenAI format
        const messages = history
            .filter(m => !m.isError && m.id !== 'system-init') // Filter out errors and initial system greeting if present
            .map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.text
            }));

        // Add current user message
        // Note: To support images, we would need to check if the model supports OpenAI vision format
        // For now, we'll append text. If attachments exist, we'll append a note or their text content if extracted.
        let userContent: any = currentMessageText;

        if (attachments.length > 0) {
            // Simple text fallback for attachments
            // If we wanted to try vision:
            // userContent = [
            //   { type: "text", text: currentMessageText },
            //   ...attachments.map(att => ({
            //     type: "image_url",
            //     image_url: { url: `data:${att.mimeType};base64,${att.base64}` } 
            //   }))
            // ];
            console.warn("Attachments are currently ignored in GLM implementation (text-only mode).");
        }

        messages.push({
            role: 'user',
            content: userContent
        });

        const body = {
            model: MODEL_ID,
            messages: messages,
            stream: true,
            max_tokens: 1000 // Adjust as needed
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

                if (trimmedLine.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(trimmedLine.slice(6));
                        const delta = data.choices?.[0]?.delta?.content;
                        if (delta) {
                            yield delta;
                        }
                    } catch (e) {
                        console.warn("Error parsing stream chunk:", e);
                    }
                }
            }
        }

    } catch (error) {
        console.error("GLM API Error:", error);
        throw error;
    }
}
