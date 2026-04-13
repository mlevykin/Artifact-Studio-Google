/**
 * Utilities for parsing Mermaid diagrams to support step-by-step presentation.
 */

export const getMermaidNodes = (content: string): string[] => {
  const nodes = new Set<string>();
  // Clean content: remove code blocks and comments
  const cleanContent = content
    .replace(/^```mermaid\n?/, '')
    .replace(/\n?```$/, '')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('%%'))
    .join('\n');

  const lines = cleanContent.split('\n');
  
  const isSequence = cleanContent.toLowerCase().includes('sequencediagram');
  if (isSequence) {
    // For sequence diagrams, "nodes" are actors
    lines.forEach(line => {
      const trimmed = line.trim();
      const actorMatch = trimmed.match(/^\s*(?:participant|actor)\s+([a-zA-Z0-9_-]+)/i);
      if (actorMatch) {
        nodes.add(actorMatch[1]);
      } else {
        // Also check messages for implicit actors
        const msgMatch = trimmed.match(/^\s*([a-zA-Z0-9_-]+)\s*(?:->|-->)\s*([a-zA-Z0-9_-]+)/);
        if (msgMatch) {
          nodes.add(msgMatch[1]);
          nodes.add(msgMatch[2]);
        }
      }
    });
    return Array.from(nodes);
  }

  // For flowcharts and other graph types
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const lower = trimmed.toLowerCase();
    // Skip subgraph definitions and structural keywords
    if (lower.startsWith('subgraph') || lower === 'end' || lower.startsWith('direction')) return;

    // 1. Match node definitions: ID[...] or ID(...) or ID{...} or ID>...] or ID((...)) etc.
    // We look for ID at the start of the line or after a space, followed by a shape start
    const defMatches = trimmed.matchAll(/(?:^|\s)([a-zA-Z0-9_-]+)(?=\s*(?:\[|\(|\{|\>))/g);
    for (const match of defMatches) {
      const id = match[1];
      if (!isKeyword(id)) {
        nodes.add(id);
      }
    }
    
    // 2. Match connections: ID1 --> ID2
    const arrowRegex = /\s*(?:---|--|==|-->|--\>|==>|==\>|->|-\>|>-|--x|--o)\s*/g;
    const parts = trimmed.split(arrowRegex);
    if (parts.length > 1) {
      parts.forEach(part => {
        // Extract the ID from the part, ignoring labels like ID[Label]
        const idMatch = part.match(/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          const id = idMatch[1];
          if (!isKeyword(id)) {
            nodes.add(id);
          }
        }
      });
    }
  });
  
  return Array.from(nodes);
};

export const getMermaidStepCount = (content: string): number => {
  const cleanContent = content
    .replace(/^```mermaid\n?/, '')
    .replace(/\n?```$/, '');
    
  const isSequence = cleanContent.toLowerCase().includes('sequencediagram');
  if (isSequence) {
    const lines = cleanContent.split('\n').filter(l => l.trim() && !l.trim().startsWith('%%'));
    const messages = lines.filter(l => l.includes('->') || l.includes('-->'));
    return messages.length;
  }
  
  const nodes = getMermaidNodes(cleanContent);
  return nodes.length;
};

const isKeyword = (id: string): boolean => {
  const keywords = [
    'graph', 'flowchart', 'subgraph', 'end', 'click', 'style', 
    'classdef', 'class', 'direction', 'td', 'lr', 'bt', 'rl',
    'participant', 'actor', 'note', 'over', 'loop', 'alt', 'opt', 'par', 'and',
    'mermaid', 'stateDiagram', 'erDiagram', 'classDiagram', 'pie', 'gantt'
  ];
  return keywords.includes(id.toLowerCase());
};
