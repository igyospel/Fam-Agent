import { GoogleGenAI } from "@google/genai";
import { Message, Attachment } from "../types";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from "../constants";

// Initialize Gemini client
// @ts-ignore - process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function* streamGeminiResponse(
  history: Message[], 
  currentMessageText: string,
  attachments: Attachment[]
) {
  try {
    // Transform history for the API
    // We only send text history for context to keep things simple for this demo, 
    // but typically you'd send previous images too if the model supports multi-turn vision well.
    // For this implementation, we'll focus on the current turn having images/docs.
    const historyContents = history
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

    // Current user message parts
    const currentParts: any[] = [];
    
    // Add attachments
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.base64
        }
      });
    });

    // Add text
    if (currentMessageText) {
      currentParts.push({ text: currentMessageText });
    }

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: historyContents // Pre-load conversation history
    });

    const result = await chat.sendMessageStream({
      message: {
        parts: currentParts
      }
    });

    for await (const chunk of result) {
      // chunk is GenerateContentResponse
      if (chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}