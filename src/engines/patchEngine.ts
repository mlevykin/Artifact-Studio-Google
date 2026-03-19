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
    // This is trickier because we need to find the actual range in the original string
    // We'll use a simpler approach: if the normalized version matches, we try to find 
    // a substring that normalizes to the same thing.
    // For now, let's implement a basic line-by-line or block-based fuzzy search if needed.
    // But usually, LLMs are consistent enough with line breaks if prompted well.
    
    // Fallback: if normalized matches but exact doesn't, it might be indentation issues.
    // Let's try to match ignoring leading/trailing whitespace on each line.
    const lines = content.split('\n');
    const oldLines = oldText.split('\n').map(l => l.trim());
    
    for (let i = 0; i <= lines.length - oldLines.length; i++) {
      let match = true;
      for (let j = 0; j < oldLines.length; j++) {
        if (lines[i + j].trim() !== oldLines[j]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        const newLines = [...lines];
        newLines.splice(i, oldLines.length, newText);
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
    return {
      type: match[1],
      title: match[2],
      content: match[3].trim()
    };
  }
  
  return null;
}

/**
 * Strips <artifact> and <patch> blocks from the text for display in chat
 */
export function stripArtifactsAndPatches(text: string): string {
  let cleaned = text;
  
  // Strip artifacts
  cleaned = cleaned.replace(/<artifact\s+type="(\w+)"\s+title="([^"]+)">([\s\S]*?)<\/artifact>/g, '');
  
  // Strip patches
  cleaned = cleaned.replace(/<patch>[\s\S]*?<\/patch>/g, '');
  
  return cleaned.trim();
}
