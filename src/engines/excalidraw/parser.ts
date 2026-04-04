import { Graph, Node, Edge, NodeType, NodeStyle } from './types';

function parseStyles(styleStr: string): any {
  if (!styleStr) return {};
  // Remove outer braces or parentheses if present
  let cleanStr = styleStr.trim();
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    cleanStr = cleanStr.substring(1, cleanStr.length - 1).trim();
  }
  if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
    cleanStr = cleanStr.substring(1, cleanStr.length - 1).trim();
  }
  
  if (!cleanStr) return {};
  
  const styles: any = {};
  const pairs = cleanStr.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(p => p.trim());
    if (key && value) {
      // Strip quotes from value if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      // Convert numeric values
      if (!isNaN(Number(cleanValue))) {
        styles[key] = Number(cleanValue);
      } else {
        styles[key] = cleanValue;
      }
    }
  }
  return styles;
}

export function parseExcalidraw(text: string): Graph {
  const nodes: Map<string, Node> = new Map();
  const edges: Edge[] = [];
  let direction: 'TB' | 'LR' | 'BT' | 'RL' | 'CIRCLE' = 'TB';
  let defaultStyle: any = {};

  // 1. Basic cleanup
  const cleanText = text.replace(/\/\/.*/g, '').replace(/#.*/g, '');
  
  // 2. Parse direction
  const dirMatch = cleanText.match(/direction\s*:\s*(TB|LR|BT|RL|CIRCLE)/i);
  if (dirMatch) {
    direction = dirMatch[1].toUpperCase() as any;
  }

  // 3. Split into logical blocks
  // A block starts at the beginning of a line with a word or a brace
  const blocks = cleanText.split(/\n(?=\w|\{)/);

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    // Standalone style block
    if (block.startsWith('{') && block.endsWith('}')) {
      defaultStyle = { ...defaultStyle, ...parseStyles(block) };
      continue;
    }

    // Edge definition: A -> B
    if (block.includes('->')) {
      const edgeMatch = block.match(/^(\w+)\s*->\s*([\s\S]*)$/);
      if (edgeMatch) {
        const [, from, rest] = edgeMatch;
        const parts = rest.split('->').map(p => p.trim());
        let currentFrom = from;

        for (const part of parts) {
          // Match "ID : Label { Style }" or "ID ( { Style } )" or just "ID"
          const partMatch = part.match(/^(\w+)(?:\s*[:]\s*([^{]*))?(?:\s*(?:\{(.*)\}|\((.*)\)))?$/s);
          if (partMatch) {
            const [, to, label, style1, style2] = partMatch;
            const styleStr = style1 || style2 || '';
            
            if (!nodes.has(currentFrom)) {
              nodes.set(currentFrom, { id: currentFrom, label: currentFrom, type: 'rectangle', style: defaultStyle });
            }
            if (!nodes.has(to)) {
              nodes.set(to, { id: to, label: to, type: 'rectangle', style: defaultStyle });
            }
            
            edges.push({ 
              from: currentFrom, 
              to, 
              label: label?.trim(),
              style: { ...defaultStyle, ...parseStyles(styleStr) }
            });
            currentFrom = to;
          }
        }
      }
      continue;
    }

    // Node definition: ID [Label] {Style}
    // Supports multi-line labels and styles
    const nodeMatch = block.match(/^(\w+)\s*(?:\[([\s\S]*?)\]|\(([\s\S]*?)\)|\{([\s\S]*?)\})(?:\s*(?:\{([\s\S]*?)\}|\(([\s\S]*?)\)))?$/);
    if (nodeMatch) {
      const [, id, rectLabel, ellipseLabel, diamondLabel, style1, style2] = nodeMatch;
      const label = (rectLabel || ellipseLabel || diamondLabel || '').trim();
      let type: NodeType = 'rectangle';
      if (diamondLabel !== undefined) type = 'diamond';
      if (ellipseLabel !== undefined) type = 'ellipse';
      
      const styleStr = style1 || style2 || '';
      
      nodes.set(id, { 
        id, 
        label: label || id, 
        type,
        style: { ...defaultStyle, ...parseStyles(styleStr) }
      });
    }
  }

  const finalNodes = Array.from(nodes.values());
  return {
    nodes: finalNodes,
    edges,
    elements: [...finalNodes, ...edges],
    direction
  };
}
