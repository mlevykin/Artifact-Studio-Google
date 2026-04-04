import { Graph, Node, Edge, NodeType, NodeStyle } from './types';

function parseStyles(styleStr: string): any {
  if (!styleStr) return {};
  // Remove outer braces or parentheses if present, even with spaces
  let cleanStr = styleStr.trim();
  while ((cleanStr.startsWith('(') && cleanStr.endsWith(')')) || (cleanStr.startsWith('{') && cleanStr.endsWith('}'))) {
    cleanStr = cleanStr.substring(1, cleanStr.length - 1).trim();
  }
  
  if (!cleanStr) return {};
  
  const styles: any = {};
  const pairs = cleanStr.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = pair.substring(0, colonIndex).trim();
    const value = pair.substring(colonIndex + 1).trim();
    
    if (key && value) {
      // Strip quotes from value if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      // Convert numeric values
      if (!isNaN(Number(cleanValue)) && cleanValue !== '') {
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

  // 3. Parse Standalone Styles
  const standaloneStyleRegex = /^\s*\{(.*?)\}\s*$/gm;
  let styleMatch;
  while ((styleMatch = standaloneStyleRegex.exec(cleanText)) !== null) {
    defaultStyle = { ...defaultStyle, ...parseStyles(styleMatch[1]) };
  }

  // 4. Parse Nodes and Edges using a more robust approach
  // We'll process the text by looking for patterns
  
  // First, find all node definitions
  // ID [Label] {Style}
  const nodeRegex = /(\w+)\s*(?:\[([\s\S]*?)\]|\(([\s\S]*?)\)|\{([\s\S]*?)\})(?:\s*(?:\{([\s\S]*?)\}|\(([\s\S]*?)\)))?/g;
  let m;
  while ((m = nodeRegex.exec(cleanText)) !== null) {
    const [full, id, rectLabel, ellipseLabel, diamondLabel, style1, style2] = m;
    
    // Skip if it looks like an edge (contains ->)
    if (full.includes('->')) continue;

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

  // Then, find all edges
  const edgeLineRegex = /^(\w+)\s*->\s*([\s\S]*?)$/gm;
  let edgeLineMatch;
  while ((edgeLineMatch = edgeLineRegex.exec(cleanText)) !== null) {
    const [, from, rest] = edgeLineMatch;
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

  const finalNodes = Array.from(nodes.values());
  return {
    nodes: finalNodes,
    edges,
    elements: [...finalNodes, ...edges],
    direction
  };
}
