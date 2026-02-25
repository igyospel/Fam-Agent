/**
 * geminiService.ts
 * 
 * All calls go through our secure serverless proxy at /api/v1/generate.
 * - Free users  → Groq (text) / NVIDIA (vision)
 * - Premium users → OpenRouter: Llama 3.3 70B (reasoning) / Gemini 2.5 Flash (vision)
 * API Keys are NEVER sent to or stored in the browser.
 */
import { Message, Attachment } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// Our own proxy endpoint (serverless function on Vercel)
const PROXY_URL = '/api/v1/generate';

export async function* streamGeminiResponse(
  history: Message[],
  currentMessageText: string,
  attachments: Attachment[],
  webSearch: boolean = false,
  isPremiumUser: boolean = false
) {
  try {
    // Build OpenAI-compatible messages for the proxy
    const messages: any[] = [
      // History (text only for context efficiency)
      ...history
        .filter(m => !m.isError && m.id !== 'system-init')
        .map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        }))
    ];

    // Build current user message
    // If has attachments (images/docs), use multi-part content array
    if (attachments.length > 0) {
      const parts: any[] = [];

      attachments.forEach(att => {
        if (att.mimeType.startsWith('image/') && att.base64) {
          // Image as inline data
          parts.push({
            type: 'image',
            mimeType: att.mimeType,
            data: att.base64
          });
        } else if (att.textContent) {
          // Document extracted as text
          parts.push({
            type: 'text',
            text: `[File: ${att.file.name}]\n${att.textContent}`
          });
        }
      });

      if (currentMessageText) {
        parts.push({ type: 'text', text: currentMessageText });
      }

      messages.push({ role: 'user', content: parts });
    } else {
      messages.push({ role: 'user', content: currentMessageText });
    }

    // Call our secure proxy — pass isPremiumUser so the proxy can pick the right model
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemInstruction: SYSTEM_INSTRUCTION,
        stream: true,
        webSearch,
        isPremiumUser
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Proxy error: ${response.status}`);
    }

    // Stream SSE response
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

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
        if (dataStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(dataStr);
          const text = parsed?.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

  } catch (error: any) {
    console.error('[GeminiService] Proxy Error:', error.message);
    throw error;
  }
}