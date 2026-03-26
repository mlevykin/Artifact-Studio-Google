import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment, Artifact, OllamaConfig, ContextSettings, Skill, MCPConfig, VerificationReport } from "../types";
import SYSTEM_PROMPT from "./systemPrompt.md?raw";

export async function verifyArtifact(
  artifact: Artifact,
  testerSkills: Skill[],
  geminiApiKey?: string,
  modelName?: string
): Promise<VerificationReport | null> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "" });
  
  const testerInstructions = testerSkills.map(s => `Tester: ${s.name}\nInstructions:\n${s.content}`).join('\n\n---\n\n');
  
  const prompt = `You are a professional software tester and reviewer.
Your task is to verify the following artifact based on the provided tester instructions.

[ARTIFACT TO VERIFY]
Title: ${artifact.title}
Type: ${artifact.type}
Content:
\`\`\`
${artifact.content}
\`\`\`

[TESTER INSTRUCTIONS]
${testerInstructions}

[YOUR TASK]
1. Analyze the artifact for any issues, bugs, or non-compliance with the instructions.
2. If there are issues, list them clearly.
3. For each issue, provide a <patch> block that fixes it.
   Format: <patch><old>...</old><new>...</new></patch>
4. If the artifact is perfect, state that it is valid.

[OUTPUT FORMAT]
Your response MUST be a JSON object with the following structure:
{
  "isValid": boolean,
  "issues": string[],
  "patches": { "old": string, "new": string }[]
}

Respond ONLY with the JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName || "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    
    return {
      testerName: testerSkills.map(s => s.name).join(', '),
      isValid: result.isValid ?? true,
      issues: result.issues || [],
      suggestedPatches: result.patches || [],
      status: 'pending'
    };
  } catch (error) {
    console.error('Verification error:', error);
    return null;
  }
}

export async function* streamGeminiResponse(
  messages: Message[],
  initialArtifact?: Artifact | null,
  onAbort?: (controller: AbortController) => void,
  onLogEntry?: (entry: any) => void,
  overrideLastMessageContent?: string,
  webSearchEnabled?: boolean,
  geminiApiKey?: string,
  modelName?: string,
  contextSettings?: ContextSettings,
  activeSkills?: Skill[],
  activeMcpConfigs?: MCPConfig[]
) {
  const currentArtifactContent = initialArtifact?.content;
  const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "" });
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const settings = contextSettings || {
    includeSystemPrompt: true,
    includeChatHistory: true,
    includeAttachmentsHistory: true,
    includeArtifactContext: true,
    includeSkills: false,
    includeMcp: false
  };

  // Filter messages based on settings
  let processedMessages = [...messages];
  if (!settings.includeChatHistory && processedMessages.length > 1) {
    // Keep only the last message if chat history is disabled
    processedMessages = [processedMessages[processedMessages.length - 1]];
  }

  const formattedMessages = processedMessages.map((m, index) => {
    const parts: any[] = [];
    const isLast = index === processedMessages.length - 1;
    const content = (isLast && overrideLastMessageContent) ? overrideLastMessageContent : m.content;
    
    // Add attachments
    if (m.attachments && (isLast || settings.includeAttachmentsHistory)) {
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
  if (formattedMessages.length > 0) {
    const lastUserMsg = [...formattedMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const hasImages = lastUserMsg.parts.some(p => p.inlineData);
      const mentionsArtifact = lastUserMsg.parts.some(p => p.text && /artifact|code|diagram|edit|change|fix|update/i.test(p.text));
      
      // Inject Artifact Context
      if (settings.includeArtifactContext && currentArtifactContent && initialArtifact && (!hasImages || mentionsArtifact)) {
        lastUserMsg.parts.push({
          text: `\n\n[CONTEXT: Current Active Artifact]\nID: ${initialArtifact.id}\nTitle: ${initialArtifact.title}\nType: ${initialArtifact.type}\nContent:\n\`\`\`\n${currentArtifactContent}\n\`\`\``
        });
      }

      // Inject MCP Context
      if (settings.includeMcp && activeMcpConfigs && activeMcpConfigs.length > 0) {
        const mcpText = activeMcpConfigs.map(m => {
          const tools = m.tools?.map(t => `- ${t.name}: ${t.description}`).join('\n') || 'No tools available';
          return `MCP Server: ${m.name}\nURL: ${m.url}\nAvailable Tools:\n${tools}`;
        }).join('\n\n---\n\n');
        lastUserMsg.parts.push({
          text: `\n\n[CONTEXT: Active MCP Servers]\n${mcpText}`
        });
      }
    }
  }

  try {
    const config: any = {};

    if (settings.includeSystemPrompt) {
      config.systemInstruction = SYSTEM_PROMPT;
    }

    if (webSearchEnabled) {
      config.tools = [{ googleSearch: {} }];
    }

    const model = modelName || "gemini-3-flash-preview";
    const result = await ai.models.generateContentStream({
      model,
      contents: formattedMessages as any,
      config
    });

    let fullText = "";
    let usageMetadata: any = null;

    for await (const chunk of result) {
      const text = chunk.text || "";
      fullText += text;
      if (chunk.usageMetadata) {
        usageMetadata = chunk.usageMetadata;
      }
      yield { text, fullText, done: false };
    }

    if (onLogEntry) {
      onLogEntry({
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
        request: {
          model,
          systemInstruction: config.systemInstruction,
          contents: formattedMessages,
          tools: config.tools,
          config: { ...config, systemInstruction: undefined }
        },
        response: {
          text: fullText,
          usageMetadata: usageMetadata ? {
            promptTokenCount: usageMetadata.promptTokenCount,
            candidatesTokenCount: usageMetadata.candidatesTokenCount,
            totalTokenCount: usageMetadata.totalTokenCount
          } : undefined
        }
      });
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
  onLogEntry?: (entry: any) => void,
  overrideLastMessageContent?: string,
  contextSettings?: ContextSettings,
  activeSkills?: Skill[],
  activeMcpConfigs?: MCPConfig[]
) {
  const currentArtifactContent = initialArtifact?.content;
  const controller = new AbortController();
  if (onAbort) onAbort(controller);

  const settings = contextSettings || {
    includeSystemPrompt: true,
    includeChatHistory: true,
    includeAttachmentsHistory: true,
    includeArtifactContext: true,
    includeSkills: false,
    includeMcp: false
  };

  let processedMessages = [...messages];
  if (!settings.includeChatHistory && processedMessages.length > 1) {
    processedMessages = [processedMessages[processedMessages.length - 1]];
  }

  const ollamaMessages = processedMessages.map((m, index) => {
    const images: string[] = [];
    const isLast = index === processedMessages.length - 1;
    let content = (isLast && overrideLastMessageContent) ? overrideLastMessageContent : (m.content || "");
    
    if (m.attachments && (isLast || settings.includeAttachmentsHistory)) {
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

  if (ollamaMessages.length > 0) {
    const lastUserMsg = [...ollamaMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const hasImages = lastUserMsg.images && lastUserMsg.images.length > 0;
      const mentionsArtifact = /artifact|code|diagram|edit|change|fix|update/i.test(lastUserMsg.content);
      
      // Inject Artifact Context
      if (settings.includeArtifactContext && currentArtifactContent && initialArtifact && (!hasImages || mentionsArtifact)) {
        lastUserMsg.content += `\n\n[CONTEXT: Current Active Artifact]\nID: ${initialArtifact.id}\nTitle: ${initialArtifact.title}\nType: ${initialArtifact.type}\nContent:\n\`\`\`\n${currentArtifactContent}\n\`\`\``;
      }

      // Inject MCP Context
      if (settings.includeMcp && activeMcpConfigs && activeMcpConfigs.length > 0) {
        const mcpText = activeMcpConfigs.map(m => {
          const tools = m.tools?.map(t => `- ${t.name}: ${t.description}`).join('\n') || 'No tools available';
          return `MCP Server: ${m.name}\nURL: ${m.url}\nAvailable Tools:\n${tools}`;
        }).join('\n\n---\n\n');
        lastUserMsg.content += `\n\n[CONTEXT: Active MCP Servers]\n${mcpText}`;
      }
    }
  }

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3',
        messages: settings.includeSystemPrompt ? [{ role: 'system', content: SYSTEM_PROMPT }, ...ollamaMessages] : ollamaMessages,
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
    let lastJson: any = null;

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
          lastJson = json;
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
        lastJson = json;
        const text = json.message?.content || "";
        fullText += text;
        yield { text, fullText, done: false };
      } catch (e) {
        // Final partial line might not be valid JSON if the stream was cut
      }
    }

    if (onLogEntry) {
      onLogEntry({
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
        request: {
          model: model || 'llama3',
          contents: ollamaMessages,
          config: { baseUrl, systemInstruction: settings.includeSystemPrompt ? SYSTEM_PROMPT : undefined }
        },
        response: {
          text: fullText,
          usageMetadata: lastJson ? {
            promptTokenCount: lastJson.prompt_eval_count || 0,
            candidatesTokenCount: lastJson.eval_count || 0,
            totalTokenCount: (lastJson.prompt_eval_count || 0) + (lastJson.eval_count || 0)
          } : undefined
        }
      });
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
  onLogEntry?: (entry: any) => void,
  overrideLastMessageContent?: string,
  webSearchEnabled?: boolean,
  geminiApiKey?: string,
  geminiModel?: string,
  contextSettings?: ContextSettings,
  activeSkills?: Skill[],
  activeMcpConfigs?: MCPConfig[]
) {
  if (provider === 'gemini') {
    yield* streamGeminiResponse(
      messages, 
      initialArtifact, 
      onAbort, 
      onLogEntry,
      overrideLastMessageContent, 
      webSearchEnabled, 
      geminiApiKey, 
      geminiModel, 
      contextSettings,
      activeSkills,
      activeMcpConfigs
    );
  } else {
    yield* streamOllamaResponse(
      messages, 
      ollamaConfig.baseUrl, 
      ollamaConfig.selectedModel, 
      initialArtifact, 
      onAbort, 
      onLogEntry,
      overrideLastMessageContent, 
      contextSettings,
      activeSkills,
      activeMcpConfigs
    );
  }
}
