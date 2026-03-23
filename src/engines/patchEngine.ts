import { Patch } from '../types';

/**
 * Normalizes whitespace for fuzzy matching
 */
function normalize(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Attempts to replace a block of text using fuzzy matching on whitespace
 */
export function fuzzyReplace(content: string, patch: Patch): string | null {
  const { old: oldText, new: newText } = patch;
  
  // 1. Try exact match first
  if (content.includes(oldText)) {
    return content.replace(oldText, newText);
  }

  // 2. Try normalized match
  const normalizedContent = normalize(content);
  const normalizedOld = normalize(oldText);

  if (normalizedContent.includes(normalizedOld)) {
    const lines = content.split('\n');
    const oldLines = oldText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (oldLines.length === 0) return content;

    for (let i = 0; i < lines.length; i++) {
      let match = true;
      let linesConsumed = 0;
      let oldLinesMatched = 0;

      while (oldLinesMatched < oldLines.length && (i + linesConsumed) < lines.length) {
        const currentLine = lines[i + linesConsumed].trim();
        const targetLine = oldLines[oldLinesMatched];

        if (currentLine === '') {
          linesConsumed++;
          continue;
        }

        if (currentLine.includes(targetLine)) {
          linesConsumed++;
          oldLinesMatched++;
        } else {
          match = false;
          break;
        }
      }

      if (match && oldLinesMatched === oldLines.length) {
        const newLines = [...lines];
        const indentation = lines[i].match(/^\s*/)?.[0] || '';
        const indentedNewText = newText.split('\n').map(l => indentation + l).join('\n');
        
        newLines.splice(i, linesConsumed, indentedNewText);
        return newLines.join('\n');
      }
    }
  }

  return null;
}

/**
 * Parses <patch> blocks from LLM response
 */
export function parsePatches(text: string): Patch[] {
  const patches: Patch[] = [];
  const patchRegex = /<patch>[\s\S]*?<old>([\s\S]*?)<\/old>[\s\S]*?<new>([\s\S]*?)<\/new>[\s\S]*?<\/patch>/g;
  
  let match;
  while ((match = patchRegex.exec(text)) !== null) {
    patches.push({
      old: match[1].trim(),
      new: match[2].trim()
    });
  }
  
  return patches;
}

/**
 * Applies a list of patches to an artifact content
 */
export function applyPatches(content: string, patches: Patch[]): { content: string; successCount: number } {
  let currentContent = content;
  let successCount = 0;

  for (const patch of patches) {
    const nextContent = fuzzyReplace(currentContent, patch);
    if (nextContent !== null) {
      currentContent = nextContent;
      successCount++;
    }
  }

  return { content: currentContent, successCount };
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
      artifacts.push({
        type: typeMatch[1],
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

      const startIndex = lastMatch.index + lastMatch[0].length;
      const remaining = text.substring(startIndex);
      const endIndex = remaining.indexOf('</artifact>');
      
      const content = endIndex !== -1 ? remaining.substring(0, endIndex) : remaining;
      
      return {
        type: typeMatch ? typeMatch[1] : '',
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
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/;
  const match = text.match(thoughtRegex);
  if (match) return match[1].trim();
  
  // Fallback for cases where model doesn't use tags but starts with "thought" or "Thought:"
  const lines = text.split('\n');
  const thoughtLines = lines.filter(l => l.toLowerCase().startsWith('thought ') || l.toLowerCase().startsWith('thought:'));
  if (thoughtLines.length > 0) {
    return thoughtLines.map(l => l.replace(/^thought:?\s*/i, '')).join('\n').trim();
  }
  
  return null;
}

/**
 * Parses <patch> blocks from LLM response, including partial ones
 */
export function parsePartialPatches(text: string): { old: string; new: string; isComplete: boolean }[] {
  const patches: { old: string; new: string; isComplete: boolean }[] = [];
  const patchRegex = /<patch>([\s\S]*?)(?:<\/patch>|$)/g;
  
  let match;
  while ((match = patchRegex.exec(text)) !== null) {
    if (match[0] === '<patch>') continue; // Skip empty match at the very end
    
    const patchContent = match[1];
    const oldMatch = patchContent.match(/<old>([\s\S]*?)(?:<\/old>|$)/);
    const newMatch = patchContent.match(/<new>([\s\S]*?)(?:<\/new>|$)/);
    
    if (oldMatch || newMatch) {
      patches.push({
        old: oldMatch ? oldMatch[1].trim() : '',
        new: newMatch ? newMatch[1].trim() : '',
        isComplete: match[0].endsWith('</patch>')
      });
    }
  }
  
  return patches;
}

/**
 * Parses <thought> blocks from LLM response, including partial ones
 */
export function parsePartialThought(text: string): string | null {
  const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/;
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
  const mcpMatch = text.match(/<mcp_call[\s\S]*?<\/mcp_call>/);
  const skillMatch = text.match(/<skill_call[\s\S]*?(?:\/>|<\/skill_call>)/);

  const mcpIndex = mcpMatch ? mcpMatch.index! + mcpMatch[0].length : Infinity;
  const skillIndex = skillMatch ? skillMatch.index! + skillMatch[0].length : Infinity;

  const firstToolEnd = Math.min(mcpIndex, skillIndex);

  if (firstToolEnd !== Infinity) {
    return text.substring(0, firstToolEnd);
  }

  // If a tool call has started but not finished, we should also truncate after it starts
  const mcpStart = text.indexOf('<mcp_call');
  const skillStart = text.indexOf('<skill_call');
  const firstToolStart = Math.min(
    mcpStart === -1 ? Infinity : mcpStart,
    skillStart === -1 ? Infinity : skillStart
  );

  if (firstToolStart !== Infinity) {
    // We want to show the tool call tag itself so it can be parsed, 
    // but nothing after it if it's not complete yet.
    // However, if it's not complete, we can't easily find the "end" of the tag.
    // For now, if it's incomplete, we just return the whole thing and let the parser handle it.
    return text;
  }

  return text;
}

/**
 * Strips <artifact>, <patch>, <thought>, <skill_call>, and <mcp_call> blocks from the text for display in chat.
 * Handles partial blocks during streaming.
 */
export function stripArtifactsAndPatches(text: string): string {
  let cleaned = text;
  
  // Strip artifacts (including partial)
  cleaned = cleaned.replace(/<artifact\s+([^>]+)>([\s\S]*?)(?:<\/artifact>|$)/g, '');
  
  // Strip patches (including partial)
  cleaned = cleaned.replace(/<patch>([\s\S]*?)(?:<\/patch>|$)/g, '');

  // Strip thoughts (including partial)
  cleaned = cleaned.replace(/<thought>([\s\S]*?)(?:<\/thought>|$)/g, '');

  // Strip fallback thoughts (lines starting with thought: or thought )
  cleaned = cleaned.split('\n')
    .filter(line => !line.toLowerCase().startsWith('thought ') && !line.toLowerCase().startsWith('thought:'))
    .join('\n');

  // Strip skill calls (handle both self-closing and paired tags)
  cleaned = cleaned.replace(/<skill_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?\s*(?:\/>|><\/skill_call>)/g, '');

  // Strip mcp calls (including partial)
  cleaned = cleaned.replace(/<mcp_call\s+name="([^"]+)"(?:\s+description="([^"]+)")?>([\s\S]*?)(?:<\/mcp_call>|$)/g, '');
  
  // Strip response tags
  cleaned = cleaned.replace(/<response>([\s\S]*?)(?:<\/response>|$)/g, '');

  return cleaned.trim();
}
