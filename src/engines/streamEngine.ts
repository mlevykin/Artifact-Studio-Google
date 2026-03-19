import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment } from "../types";

const SYSTEM_PROMPT = `You are an expert assistant capable of generating high-quality "Artifacts".
Artifacts are self-contained pieces of content like diagrams, code, documents, or graphics.

When asked to create a new artifact, use the following format:
<artifact type="mermaid|html|markdown|svg" title="Descriptive Title">
Content goes here...
</artifact>

When asked to edit an existing artifact, you MUST use <patch> blocks to provide specific edits instead of re-generating the whole thing.
Format for patches:
<patch>
<old>
Exact block of code to replace
</old>
<new>
New block of code
</new>
</patch>

Types of artifacts:
- mermaid: For diagrams (flowcharts, sequence, gantt, etc.)
- html: For interactive web components or simple apps.
- markdown: For rich text documents.
- svg: For vector graphics.

Guidelines:
- Be concise in your conversational response.
- Focus on the artifact quality.
- For HTML, include necessary CSS in <style> tags.
- For Mermaid, use v11 syntax.
`;

export async function* streamGeminiResponse(
  messages: Message[],
  currentArtifactContent?: string,
  onAbort?: (controller: AbortController) => void
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const formattedMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model' as any,
    parts: [
      ...(m.attachments || []).map(a => ({
        inlineData: {
          mimeType: a.mimeType,
          data: a.data
        }
      })),
      { text: m.content }
    ]
  }));

  // Inject current artifact context if editing
  if (currentArtifactContent && formattedMessages.length > 0) {
    const lastUserMsg = [...formattedMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      lastUserMsg.parts.push({
        text: `\n\nCONTEXT: The current artifact content is:\n\`\`\`\n${currentArtifactContent}\n\`\`\`\nPlease provide edits using <patch> blocks if possible.`
      });
    }
  }

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: formattedMessages as any,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text || "";
      fullText += text;
      yield { text, fullText, done: false };
    }

    yield { text: "", fullText, done: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      yield { text: " ⬛", fullText: "", done: true, aborted: true };
    } else {
      throw error;
    }
  }
}

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) return ['llama3'];
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || ['llama3'];
  } catch (e) {
    console.error('Failed to fetch Ollama models', e);
    return ['llama3'];
  }
}

export async function* streamOllamaResponse(
  messages: Message[],
  baseUrl: string,
  model: string,
  currentArtifactContent?: string,
  onAbort?: (controller: AbortController) => void
) {
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const ollamaMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  if (currentArtifactContent && ollamaMessages.length > 0) {
    const lastUserMsg = [...ollamaMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      lastUserMsg.content += `\n\nCONTEXT: The current artifact content is:\n\`\`\`\n${currentArtifactContent}\n\`\`\`\nPlease provide edits using <patch> blocks if possible.`;
    }
  }

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...ollamaMessages],
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('Ollama connection failed');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const text = json.message?.content || "";
          fullText += text;
          yield { text, fullText, done: false };
        } catch (e) {
          console.error('Error parsing Ollama JSON', e);
        }
      }
    }

    yield { text: "", fullText, done: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      yield { text: " ⬛", fullText: "", done: true, aborted: true };
    } else {
      throw error;
    }
  }
}

export async function* streamResponse(
  provider: 'gemini' | 'ollama',
  messages: Message[],
  ollamaConfig: { baseUrl: string; model: string },
  currentArtifactContent?: string,
  onAbort?: (controller: AbortController) => void
) {
  if (provider === 'gemini') {
    yield* streamGeminiResponse(messages, currentArtifactContent, onAbort);
  } else {
    yield* streamOllamaResponse(messages, ollamaConfig.baseUrl, ollamaConfig.model, currentArtifactContent, onAbort);
  }
}
