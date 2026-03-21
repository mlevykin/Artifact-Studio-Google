import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment } from "../types";

const SYSTEM_PROMPT = `You are an expert assistant capable of generating high-quality "Artifacts".
Artifacts are self-contained pieces of content like diagrams, code, documents, or graphics.

PLANNING & REASONING:
Before generating a complex artifact or performing a multi-step task, you SHOULD use <thought> tags to outline your plan, reasoning, or verification steps.
Example:
<thought>
1. Analyze the user's request for a multi-file React app.
2. Plan the file structure: App.tsx, components/Header.tsx, hooks/useData.ts.
3. Implement the components one by one.
</thought>

REPORTING ACTIONS (STEPS):
When you use a skill or an MCP server, you MUST report it at the beginning of your response using these tags.
Each tag MUST include a "description" attribute explaining what you are doing in a human-readable way.
Example:
<skill_call name="Senior QA" description="Adding context from the Senior QA skill to better understand your testing requirements." />
<mcp_call name="File Search" description="Searching the workspace for relevant files using the File Search MCP."><request>{"query": "App.tsx"}</request><response>{"files": ["src/App.tsx"]}</response></mcp_call>

These reports should look like "steps" you are taking to fulfill the request.
Do NOT mention these calls in the visible chat text.

ARTIFACTS:
ONLY generate an artifact if the user's request explicitly or implicitly requires a substantial piece of content.
DO NOT generate artifacts for simple greetings or conversational filler.

When asked to create a new artifact, use the following format:
<artifact type="mermaid|html|markdown|svg|project" title="Descriptive Title">
Content goes here...
</artifact>

MULTI-FILE PROJECTS:
For complex applications, use type="project". The content should be a JSON array of files:
<artifact type="project" title="My Web App">
[
  { "path": "src/App.tsx", "content": "..." },
  { "path": "src/components/Button.tsx", "content": "..." }
]
</artifact>

PATCHES:
When asked to edit an existing artifact, you MUST use <patch> blocks.
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
- mermaid: For diagrams.
- html: For interactive web components or simple apps.
- markdown: For rich text documents.
- svg: For vector graphics.
- project: For multi-file projects (JSON array of files).

Guidelines:
- Be concise in your conversational response.
- ALWAYS use Markdown for formatting.
- For HTML, include necessary CSS in <style> tags.
- For Mermaid, use v11 syntax and wrap node labels in double quotes.
`;

export async function* streamGeminiResponse(
  messages: Message[],
  currentArtifactContent?: string,
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const formattedMessages = messages.map((m, index) => {
    const parts: any[] = [];
    const isLast = index === messages.length - 1;
    const content = (isLast && overrideLastMessageContent) ? overrideLastMessageContent : m.content;
    
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
    parts.push({ text: content || (m.attachments?.length ? "" : " ") });
    
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
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const ollamaMessages = messages.map((m, index) => {
    const images: string[] = [];
    const isLast = index === messages.length - 1;
    let content = (isLast && overrideLastMessageContent) ? overrideLastMessageContent : (m.content || "");
    
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
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  if (provider === 'gemini') {
    yield* streamGeminiResponse(messages, currentArtifactContent, onAbort, overrideLastMessageContent);
  } else {
    yield* streamOllamaResponse(messages, ollamaConfig.baseUrl, ollamaConfig.model, currentArtifactContent, onAbort, overrideLastMessageContent);
  }
}
