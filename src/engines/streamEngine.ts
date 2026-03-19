import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment } from "../types";

const SYSTEM_PROMPT = `You are an expert assistant capable of generating high-quality "Artifacts".
Artifacts are self-contained pieces of content like diagrams, code, documents, or graphics.

ONLY generate an artifact if the user's request explicitly or implicitly requires a substantial piece of content (like a script, a diagram, a full document, or a web component).
DO NOT generate artifacts for simple greetings, short answers, or conversational filler.

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
- ALWAYS use Markdown for formatting (bold, italics, lists, tables, headers) to make your response readable and professional.
- Focus on the artifact quality.
- For HTML, include necessary CSS in <style> tags.
- For Mermaid, use v11 syntax and ALWAYS wrap node labels in double quotes to avoid parse errors (e.g., A["Label (with parens)"]).
`;

export async function* streamGeminiResponse(
  messages: Message[],
  currentArtifactContent?: string,
  onAbort?: (controller: AbortController) => void
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const formattedMessages = messages.map(m => {
    const parts: any[] = [];
    
    // Add attachments
    if (m.attachments) {
      for (const a of m.attachments) {
        if (a.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: a.mimeType,
              data: a.data
            }
          });
        } else {
          // Text attachments are added as text parts
          parts.push({ text: `\n\nAttachment (${a.name}):\n${a.data}\n` });
        }
      }
    }
    
    // Add main content
    parts.push({ text: m.content || (m.attachments?.length ? "" : " ") });
    
    return {
      role: m.role === 'user' ? 'user' : 'model' as any,
      parts
    };
  });

  // Inject current artifact context if editing
  // Only inject if there are no images in the last message, or if the user explicitly mentions the artifact
  if (currentArtifactContent && formattedMessages.length > 0) {
    const lastUserMsg = [...formattedMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const hasImages = lastUserMsg.parts.some(p => p.inlineData);
      const mentionsArtifact = lastUserMsg.parts.some(p => p.text && /artifact|code|diagram|edit|change|fix|update/i.test(p.text));
      
      if (!hasImages || mentionsArtifact) {
        lastUserMsg.parts.push({
          text: `\n\n[CONTEXT: The current artifact content is provided below. Use it if the user asks to edit or reference it.]\n\`\`\`\n${currentArtifactContent}\n\`\`\``
        });
      }
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

  const ollamaMessages = messages.map(m => {
    const images: string[] = [];
    let content = m.content || "";
    
    if (m.attachments) {
      for (const a of m.attachments) {
        if (a.type === 'image') {
          images.push(a.data);
        } else {
          content += `\n\nAttachment (${a.name}):\n${a.data}\n`;
        }
      }
    }
    
    return {
      role: m.role,
      content,
      images: images.length > 0 ? images : undefined
    };
  });

  if (currentArtifactContent && ollamaMessages.length > 0) {
    const lastUserMsg = [...ollamaMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const hasImages = lastUserMsg.images && lastUserMsg.images.length > 0;
      const mentionsArtifact = /artifact|code|diagram|edit|change|fix|update/i.test(lastUserMsg.content);
      
      if (!hasImages || mentionsArtifact) {
        lastUserMsg.content += `\n\n[CONTEXT: The current artifact content is provided below. Use it if the user asks to edit or reference it.]\n\`\`\`\n${currentArtifactContent}\n\`\`\``;
      }
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
