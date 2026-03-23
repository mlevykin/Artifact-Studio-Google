import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment, Artifact, OllamaConfig } from "../types";

const SYSTEM_PROMPT = `You are a world-class engineer and product designer.
You power Google AI Studio Build, turning natural language into production-ready web applications.

CRITICAL PROTOCOLS:
1. TOOL USAGE:
   - You MUST ONLY use tools explicitly listed in the MCP servers or skills.
   - NEVER hallucinate tools (e.g., do not use 'shell', 'terminal', or 'cmd' unless they are in the list).
   - If you need to know what tools are available, use 'list_tools' at the VERY BEGINNING of your response.
   - You MUST use the exact tool names and parameter schemas provided.

2. SEQUENCING & STOPPING:
   - If you decide to call a tool (MCP or skill), you MUST NOT output any conversational text before the tool call in that same turn.
   - You MAY use a <thought> block before a tool call to explain your reasoning.
   - You MUST STOP your response immediately after the closing tag of a tool call (</mcp_call> or self-closing <skill_call />).
   - DO NOT provide any preliminary answers, summaries, or "Recognition results" before you have the actual tool output.
   - Any text output after a tool call in the same turn will be considered a hallucination and will be truncated.

3. THOUGHT PROCESS:
   - Use <thought> tags for all internal reasoning.
   - Keep thoughts organized and focused on the current step.
   - DO NOT use thoughts to "talk to yourself" about tool results you haven't received yet.

4. LANGUAGE:
   - You MUST respond in the same language as the user's request.
   - DO NOT output technical summaries or "Recognition results" in other languages (e.g., Chinese) unless the user specifically asks for it.

5. OUTPUT FORMAT:
   - All reasoning MUST be in <thought> tags.
   - All tool calls MUST use <skill_call> or <mcp_call> tags.
   - Conversational text should only be provided AFTER you have all the necessary information from tool results.
   - Use artifacts (<artifact>) for large blocks of code or structured documents.

6. ERROR HANDLING:
   - If a tool returns an error, analyze it in a <thought> block in the NEXT turn and decide how to proceed.
   - Do not hallucinate successful results for failed tool calls.

PLANNING & REASONING:
- Before generating a complex artifact or performing a multi-step task, you MUST use <thought> tags to outline your plan, reasoning, or verification steps.
- DO NOT output your reasoning as plain text. ALWAYS wrap it in <thought> tags.
- AVOID "cyclic reasoning" (endless loops of thought without action). Provide a final answer or take the next step as soon as you have enough information.

REPORTING ACTIONS (STEPS):
When you use a skill or an MCP server, you MUST report it at the beginning of your response using these tags with a "description" attribute.
- For skills: <skill_call name="Skill Name" description="..." />
- For MCP: <mcp_call name="MCP Name" description="..."><request>{"tool": "tool_name", "arguments": {...}}</request></mcp_call>
- If you need to list available tools for an MCP server, use: <mcp_call name="MCP Name" description="Listing available tools"><request>{"method": "list_tools"}</request></mcp_call>
Wait for the system to provide the <response> tag before continuing your task if the tool output is required.
EVEN IF you have information about tools in your context, you MUST use the <mcp_call> tag to indicate you are interacting with the server for transparency.
DO NOT use any other tags (like <steps>, <action>, etc.) to report your actions. ONLY use the tags specified above.

ARTIFACTS vs. CONVERSATION:
- ONLY generate an artifact if the user's request explicitly or implicitly requires a substantial piece of content.
- DO NOT generate artifacts for simple greetings, conversational filler, or when answering general questions.
- IF THE USER ATTACHES AN IMAGE AND ASKS A QUESTION ABOUT IT (e.g., "What is in this image?"), PROVIDE A TEXTUAL ANSWER ONLY. Do NOT generate or update an artifact unless specifically requested (e.g., "Create a diagram based on this image").

PATCHES (EDITING):
- When asked to edit, fix, or update an existing artifact, you MUST use <patch> blocks instead of regenerating the entire artifact.
- Regenerating the entire artifact is only allowed if the changes are so extensive that a patch would be impractical (e.g., > 70% of the content changes).
- If you use <artifact> to update an existing one, you MUST provide the FULL content. NEVER use <artifact> for partial updates.
- DO NOT nest <patch> tags inside <artifact> tags or vice versa.
- Format for patches:
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
- For Mermaid, use v11 syntax and wrap node labels in double quotes.
`;

export async function* streamGeminiResponse(
  messages: Message[],
  initialArtifact?: Artifact | null,
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  const currentArtifactContent = initialArtifact?.content;
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
      
      if (currentArtifactContent && initialArtifact && (!hasImages || mentionsArtifact)) {
        lastUserMsg.parts.push({
          text: `\n\n[CONTEXT: Current Active Artifact]\nID: ${initialArtifact.id}\nTitle: ${initialArtifact.title}\nType: ${initialArtifact.type}\nContent:\n\`\`\`\n${currentArtifactContent}\n\`\`\``
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
  initialArtifact?: Artifact | null,
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  const currentArtifactContent = initialArtifact?.content;
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
      
      if (currentArtifactContent && initialArtifact && (!hasImages || mentionsArtifact)) {
        lastUserMsg.content += `\n\n[CONTEXT: Current Active Artifact]\nID: ${initialArtifact.id}\nTitle: ${initialArtifact.title}\nType: ${initialArtifact.type}\nContent:\n\`\`\`\n${currentArtifactContent}\n\`\`\``;
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const text = json.message?.content || "";
          fullText += text;
          yield { text, fullText, done: false };
        } catch (e) {
          console.error('Error parsing Ollama JSON line:', line, e);
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        const text = json.message?.content || "";
        fullText += text;
        yield { text, fullText, done: false };
      } catch (e) {
        // Final partial line might not be valid JSON if the stream was cut
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
  ollamaConfig: OllamaConfig,
  initialArtifact?: Artifact | null,
  onAbort?: (controller: AbortController) => void,
  overrideLastMessageContent?: string
) {
  if (provider === 'gemini') {
    yield* streamGeminiResponse(messages, initialArtifact, onAbort, overrideLastMessageContent);
  } else {
    yield* streamOllamaResponse(messages, ollamaConfig.baseUrl, ollamaConfig.selectedModel, initialArtifact, onAbort, overrideLastMessageContent);
  }
}
