import { Patch, MessageStep } from '../types';

/**
 * Parses <patch> blocks from LLM response
 */
export function parsePatches(text: string): Patch[] {
  const patches: Patch[] = [];
  // Allow attributes in <patch> tag and be more flexible with whitespace
  const patchRegex = /<patch\s*([^>]*?)>[\s\S]*?<old>([\s\S]*?)<\/old>[\s\S]*?<new>([\s\S]*?)<\/new>[\s\S]*?<\/patch>/g;
  
  let match;
  while ((match = patchRegex.exec(text)) !== null) {
    const attrString = match[1];
    const old = match[2].trim();
    const newText = match[3].trim();
    
    const idMatch = attrString.match(/id="([^"]+)"/);
    const titleMatch = attrString.match(/title="([^"]+)"/);
    
    patches.push({
      old,
      new: newText,
      artifactId: idMatch ? idMatch[1] : undefined,
      title: titleMatch ? titleMatch[1] : undefined
    });
  }
  
  return patches;
}

/**
 * Parses <patch> blocks from LLM response, including partial ones
 */
export function parsePartialPatches(text: string): { old: string; new: string; isComplete: boolean; artifactId?: string; title?: string }[] {
  const patches: { old: string; new: string; isComplete: boolean; artifactId?: string; title?: string }[] = [];
  const patchRegex = /<patch\s*([^>]*?)>([\s\S]*?)(?:<\/patch>|$)/g;
  
  let match;
  while ((match = patchRegex.exec(text)) !== null) {
    const attrString = match[1];
    const patchContent = match[2];
    
    if (!attrString && !patchContent) continue;
    
    const idMatch = attrString.match(/id="([^"]*)"?/);
    const titleMatch = attrString.match(/title="([^"]*)"?/);
    
    const oldMatch = patchContent.match(/<old>([\s\S]*?)(?:<\/old>|$)/);
    const newMatch = patchContent.match(/<new>([\s\S]*?)(?:<\/new>|$)/);
    
    if (oldMatch || newMatch) {
      patches.push({
        old: oldMatch ? oldMatch[1].trim() : '',
        new: newMatch ? newMatch[1].trim() : '',
        isComplete: match[0].endsWith('</patch>'),
        artifactId: idMatch ? idMatch[1] : undefined,
        title: titleMatch ? titleMatch[1] : undefined
      });
    }
  }
  
  return patches;
}

/**
 * Parses all <artifact> blocks from LLM response
 */
export function parseArtifacts(text: string): { type: string; title: string; content: string; id?: string }[] {
  const artifacts: { type: string; title: string; content: string; id?: string }[] = [];
  const artifactRegex = /<artifact\s+([^>]+)>([\s\S]*?)<\/artifact>/g;
  
  let match;
  while ((match = artifactRegex.exec(text)) !== null) {
    const attrString = match[1];
    const content = match[2].trim();
    
    const typeMatch = attrString.match(/type="([^"]+)"/);
    const titleMatch = attrString.match(/title="([^"]+)"/);
    const idMatch = attrString.match(/id="([^"]+)"/);
    
    if (typeMatch && titleMatch) {
      let type = typeMatch[1].toLowerCase();
      if (type === 'text/markdown') type = 'markdown';
      
      artifacts.push({
        type,
        title: titleMatch[1],
        id: idMatch ? idMatch[1] : undefined,
        content
      });
    }
  }
  
  return artifacts;
}

/**
 * Parses a full or partial artifact from LLM response for streaming.
 * Returns the LAST artifact found in the text (the one currently being typed).
 */
export function parsePartialArtifact(text: string): { type: string; title: string; content: string; id?: string; isComplete: boolean } | null {
  const artifactStartRegex = /<artifact\s+([^>]*)(?:>|$)/g;
  let lastMatch = null;
  let match;
  
  while ((match = artifactStartRegex.exec(text)) !== null) {
    lastMatch = match;
  }
  
    if (lastMatch) {
      const attrString = lastMatch[1];
      const typeMatch = attrString.match(/type="([^"]*)"?/);
      const titleMatch = attrString.match(/title="([^"]*)"?/);
      const idMatch = attrString.match(/id="([^"]*)"?/);

      let type = typeMatch ? typeMatch[1].toLowerCase() : '';
      if (type === 'text/markdown') type = 'markdown';

      const startIndex = lastMatch.index + lastMatch[0].length;
      const remaining = text.substring(startIndex);
      const endIndex = remaining.indexOf('</artifact>');
      
      const content = endIndex !== -1 ? remaining.substring(0, endIndex) : remaining;
      
      return {
        type,
        title: titleMatch ? titleMatch[1] : '',
        id: idMatch ? idMatch[1] : undefined,
        content: content,
        isComplete: endIndex !== -1
      };
    }
  
  return null;
}

/**
 * Parses <thought> blocks from LLM response
 */
export function parseThought(text: string): string | null {
  const thoughtRegex = /<thought[^>]*>([\s\S]*?)<\/thought>/;
  const match = text.match(thoughtRegex);
  if (match) {
    let content = match[1].trim();
    // Strip artifacts and patches from thought content
    content = content.replace(/<artifact[\s\S]*?(?:<\/artifact>|$)/g, '');
    content = content.replace(/<patch[\s\S]*?(?:<\/patch>|$)/g, '');
    return content.trim();
  }
  
  // Fallback for cases where model doesn't use tags but starts with "thought" or "Thought:"
  const lines = text.split('\n');
  const thoughtLines = lines.filter(l => {
    const lower = l.toLowerCase();
    return lower.startsWith('thought ') || lower.startsWith('thought:') || lower.startsWith('thought process');
  });
  if (thoughtLines.length > 0) {
    return thoughtLines.map(l => l.replace(/^(thought process|thought):?\s*/i, '').trim()).filter(l => l.length > 0).join('\n').trim();
  }
  
  return null;
}

/**
 * Parses <thought> blocks from LLM response, including partial ones
 */
export function parsePartialThought(text: string): string | null {
  const thoughtRegex = /<thought[^>]*>([\s\S]*?)(?:<\/thought>|$)/;
  const match = text.match(thoughtRegex);
  if (match) return match[1].trim();

  // Fallback for partial thought without tags
  const lines = text.split('\n');
  const thoughtLines = lines.filter(l => l.toLowerCase().startsWith('thought ') || l.toLowerCase().startsWith('thought:'));
  if (thoughtLines.length > 0) {
    return thoughtLines.map(l => l.replace(/^thought:?\s*/i, '')).join('\n').trim();
  }

  return null;
}

/**
 * Parses <skill_call> blocks from LLM response
 */
export function parseInvokedSkills(text: string): { name: string; description?: string }[] {
  const skills: { name: string; description?: string }[] = [];
  const skillRegex = /<skill_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?\s*\/>/g;
  
  let match;
  while ((match = skillRegex.exec(text)) !== null) {
    skills.push({
      name: match[1],
      description: match[2]
    });
  }
  
  return skills;
}

/**
 * Parses <mcp_call> blocks from LLM response
 */
export function parseMcpCalls(text: string): { name: string; description?: string; request: any; response?: any }[] {
  const calls: { name: string; description?: string; request: any; response?: any }[] = [];
  // Match both complete calls with response and calls with just request
  const mcpRegex = /<mcp_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?>\s*<request>([\s\S]*?)<\/request>(?:\s*<response>([\s\S]*?)<\/response>)?\s*<\/mcp_call>/g;
  
  let match;
  while ((match = mcpRegex.exec(text)) !== null) {
    const name = match[1];
    const description = match[2];
    const requestRaw = match[3].trim();
    const responseRaw = match[4] ? match[4].trim() : undefined;
    
    let request = requestRaw;
    let response = responseRaw;

    try {
      request = JSON.parse(requestRaw);
    } catch (e) {
      // Fallback to raw text
    }

    if (responseRaw) {
      try {
        response = JSON.parse(responseRaw);
      } catch (e) {
        // Fallback to raw text
      }
    }

    calls.push({ name, description, request, response });
  }
  
  return calls;
}

/**
 * Parses <mcp_call> blocks from LLM response, including partial ones for streaming
 */
export function parsePartialMcpCalls(text: string): { name: string; description?: string; request: string; isComplete: boolean }[] {
  const calls: { name: string; description?: string; request: string; isComplete: boolean }[] = [];
  const mcpRegex = /<mcp_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?>([\s\S]*?)(?:<\/mcp_call>|$)/g;
  
  let match;
  while ((match = mcpRegex.exec(text)) !== null) {
    const name = match[1];
    const description = match[2];
    const content = match[3];
    
    const requestMatch = content.match(/<request>([\s\S]*?)(?:<\/request>|$)/);
    
    if (requestMatch) {
      calls.push({
        name,
        description,
        request: requestMatch[1].trim(),
        isComplete: match[0].endsWith('</mcp_call>')
      });
    }
  }
  
  return calls;
}

/**
 * Truncates text after the first tool call (mcp or skill) to prevent hallucinations from being displayed.
 */
export function truncateAfterToolCall(text: string): string {
  const mcpMatches = Array.from(text.matchAll(/<mcp_call[\s\S]*?<\/mcp_call>/g));

  let lastToolEnd = -1;

  for (const match of mcpMatches) {
    const end = match.index! + match[0].length;
    if (end > lastToolEnd) lastToolEnd = end;
  }

  if (lastToolEnd !== -1) {
    return text.substring(0, lastToolEnd);
  }

  // If an MCP call has started but not finished, we should also truncate after it starts
  const mcpStart = text.indexOf('<mcp_call');

  if (mcpStart !== -1) {
    // We want to show the tool call tag itself so it can be parsed, 
    // but nothing after it if it's not complete yet.
    // For skills, we allow the model to continue in the same turn.
    return text;
  }

  return text;
}

/**
 * Parses the message into a sequence of steps (text, thought, skill, mcp) to preserve visual order.
 */
export function parseMessageSteps(text: string, mcpCalls?: any[]): MessageStep[] {
  const steps: MessageStep[] = [];
  
  // Regex to find tags and their positions, including unclosed tags during streaming
  const tagsRegex = /(<thought[^>]*>[\s\S]*?(?:<\/thought>|$)|<skill_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?\s*(?:\/>|><\/skill_call>|>)|<mcp_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?>([\s\S]*?)(?:<\/mcp_call>|$)|<artifact[\s\S]*?(?:<\/artifact>|$)|<patch[\s\S]*?(?:<\/patch>|$)|<response>[\s\S]*?(?:<\/response>|$))/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = tagsRegex.exec(text)) !== null) {
    // Text before tag
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      // Check for fallback thoughts in textBefore
      const lines = textBefore.split('\n');
      let currentText = '';
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('thought ') || lowerLine.startsWith('thought:') || lowerLine.startsWith('thought process')) {
          if (currentText.trim()) steps.push({ type: 'text', content: currentText.trim() });
          const content = line.replace(/^(thought process|thought):?\s*/i, '').trim();
          steps.push({ type: 'thought', content: content || 'Reasoning' });
          currentText = '';
        } else {
          currentText += line + '\n';
        }
      }
      if (currentText.trim()) steps.push({ type: 'text', content: currentText.trim() });
    }
    
    // The tag itself
    const fullMatch = match[0];
    if (fullMatch.startsWith('<thought')) {
      let content = fullMatch.replace(/<thought[^>]*>/g, '').replace(/<\/thought>/g, '').trim();
      // Strip artifacts and patches from thought content
      content = content.replace(/<artifact[\s\S]*?(?:<\/artifact>|$)/g, '');
      content = content.replace(/<patch[\s\S]*?(?:<\/patch>|$)/g, '');
      steps.push({ type: 'thought', content });
    } else if (fullMatch.startsWith('<skill_call')) {
      steps.push({ type: 'skill', name: match[2], description: match[3] });
    } else if (fullMatch.startsWith('<mcp_call')) {
      const name = match[4];
      const description = match[5];
      const content = match[6] || '';
      
      // Check for thought inside mcp_call
      const internalThoughtMatch = content.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/);
      if (internalThoughtMatch) {
        steps.push({ type: 'thought', content: internalThoughtMatch[1].trim() });
      }
      
      // Find the corresponding executed MCP call
      const mcpCall = mcpCalls?.find(c => c.name === name && content.includes(c.request?.method || ''));
      
      steps.push({ 
        type: 'mcp', 
        name, 
        description, 
        content: content.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/, '').trim(),
        request: mcpCall?.request, 
        response: mcpCall?.response
      });
    } else if (fullMatch.startsWith('<artifact') || fullMatch.startsWith('<patch') || fullMatch.startsWith('<response')) {
      // Skip these for chat display, as they are handled elsewhere or are technical noise
    }
    
    lastIndex = tagsRegex.lastIndex;
  }
  
  // Remaining text
  const remainingText = text.substring(lastIndex);
  if (remainingText.trim()) {
    // Check for fallback thoughts in remainingText
    const lines = remainingText.split('\n');
    let currentText = '';
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('thought ') || lowerLine.startsWith('thought:') || lowerLine.startsWith('thought process')) {
        if (currentText.trim()) steps.push({ type: 'text', content: currentText.trim() });
        const content = line.replace(/^(thought process|thought):?\s*/i, '').trim();
        steps.push({ type: 'thought', content: content || 'Reasoning' });
        currentText = '';
      } else {
        currentText += line + '\n';
      }
    }
    if (currentText.trim()) steps.push({ type: 'text', content: currentText.trim() });
  }
  
  return steps;
}

/**
 * Strips <artifact>, <patch>, <thought>, <skill_call>, and <mcp_call> blocks from the text for display in chat.
 * Handles partial blocks during streaming.
 */
export function stripArtifactsAndPatches(text: string): string {
  let cleaned = text;
  
  // Strip artifacts (including partial)
  cleaned = cleaned.replace(/<artifact[\s\S]*?(?:<\/artifact>|$)/g, '');
  
  // Strip patches (including partial)
  cleaned = cleaned.replace(/<patch[\s\S]*?(?:<\/patch>|$)/g, '');

  // Strip thoughts (including partial)
  cleaned = cleaned.replace(/<thought[^>]*>([\s\S]*?)(?:<\/thought>|$)/g, '');

  // Strip fallback thoughts (lines starting with thought: or thought )
  cleaned = cleaned.split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return !lower.startsWith('thought ') && !lower.startsWith('thought:') && !lower.startsWith('thought process');
    })
    .join('\n');

  // Strip skill calls (handle both self-closing and paired tags, and unclosed ones)
  cleaned = cleaned.replace(/<skill_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?\s*(?:\/>|><\/skill_call>|>)/g, '');

  // Strip mcp calls (including partial)
  cleaned = cleaned.replace(/<mcp_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?>([\s\S]*?)(?:<\/mcp_call>|$)/g, '');
  
  // Strip standalone request/response tags (sometimes model hallucinations)
  cleaned = cleaned.replace(/<request>([\s\S]*?)(?:<\/request>|$)/g, '');
  cleaned = cleaned.replace(/<response>([\s\S]*?)(?:<\/response>|$)/g, '');

  // Strip any leftover unclosed tags at the end of the text
  cleaned = cleaned.replace(/<(artifact|patch|thought|skill_call|mcp_call|request|response)[^>]*$/g, '');

  return cleaned.trim();
}
