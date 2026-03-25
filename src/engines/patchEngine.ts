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
  
  if (!oldText.trim()) return content;

  // 1. Try exact match first
  if (content.includes(oldText)) {
    return content.replace(oldText, newText);
  }

  // 2. Try normalized match (ignoring whitespace differences)
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

      // Skip leading empty lines in content
      while (i + linesConsumed < lines.length && lines[i + linesConsumed].trim() === '') {
        linesConsumed++;
      }

      const startLineIdx = i + linesConsumed;

      while (oldLinesMatched < oldLines.length && (i + linesConsumed) < lines.length) {
        const currentLine = lines[i + linesConsumed].trim();
        const targetLine = oldLines[oldLinesMatched];

        if (currentLine === '') {
          linesConsumed++;
          continue;
        }

        // Use a more fuzzy line match: ignore all whitespace within lines
        const cleanCurrent = currentLine.replace(/\s+/g, '');
        const cleanTarget = targetLine.replace(/\s+/g, '');

        if (cleanCurrent.includes(cleanTarget) || cleanTarget.includes(cleanCurrent)) {
          linesConsumed++;
          oldLinesMatched++;
        } else {
          match = false;
          break;
        }
      }

      if (match && oldLinesMatched === oldLines.length) {
        const newLines = [...lines];
        const indentation = lines[startLineIdx]?.match(/^\s*/)?.[0] || '';
        
        const newTextLines = newText.split('\n');
        const minNewIndentation = newTextLines
          .filter(l => l.trim().length > 0)
          .reduce((min, l) => {
            const indent = l.match(/^\s*/)?.[0].length || 0;
            return Math.min(min, indent);
          }, Infinity);
        
        const normalizedNewLines = minNewIndentation === Infinity 
          ? newTextLines 
          : newTextLines.map(l => l.substring(minNewIndentation));

        const indentedNewText = normalizedNewLines.map(l => indentation + l).join('\n');
        
        newLines.splice(i, linesConsumed, indentedNewText);
        return newLines.join('\n');
      }
    }
  }

  // 3. Last resort: if it's a single line or very short, try to find it anywhere
  if (oldText.trim().length < 50 && content.includes(oldText.trim())) {
    return content.replace(oldText.trim(), newText);
  }

  return null;
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
