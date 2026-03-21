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

    for (let i = 0; i <= lines.length - oldLines.length; i++) {
      let match = true;
      for (let j = 0; j < oldLines.length; j++) {
        // Check if the line contains the expected text, ignoring leading/trailing whitespace
        if (!lines[i + j].trim().includes(oldLines[j])) {
          match = false;
          break;
        }
      }
      
      if (match) {
        const newLines = [...lines];
        // Replace the matched range with the new text
        // We try to preserve the indentation of the first line
        const indentation = lines[i].match(/^\s*/)?.[0] || '';
        const indentedNewText = newText.split('\n').map(l => indentation + l).join('\n');
        
        newLines.splice(i, oldLines.length, indentedNewText);
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
 * Parses a full artifact from LLM response
 */
export function parseArtifact(text: string): { type: string; title: string; content: string } | null {
  const artifactRegex = /<artifact\s+type="(\w+)"\s+title="([^"]+)">([\s\S]*?)<\/artifact>/;
  const match = text.match(artifactRegex);
  
  if (match) {
    const content = match[3].trim();
    
    // If the content itself contains a patch, it's likely a hallucination where the LLM 
    // wrapped a patch in artifact tags. We should return null so the patch engine can 
    // handle it properly from the raw text.
    if (content.includes('<patch>') && content.includes('<old>') && content.includes('<new>')) {
      return null;
    }

    return {
      type: match[1],
      title: match[2],
      content
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
  return match ? match[1].trim() : null;
}

/**
 * Strips <artifact>, <patch>, and <thought> blocks from the text for display in chat
 */
export function stripArtifactsAndPatches(text: string): string {
  let cleaned = text;
  
  // Strip artifacts
  cleaned = cleaned.replace(/<artifact\s+type="(\w+)"\s+title="([^"]+)">([\s\S]*?)<\/artifact>/g, '');
  
  // Strip patches
  cleaned = cleaned.replace(/<patch>[\s\S]*?<\/patch>/g, '');

  // Strip thoughts
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/g, '');
  
  return cleaned.trim();
}
