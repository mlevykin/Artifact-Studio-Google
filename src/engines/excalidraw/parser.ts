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
  const elements: (Node | Edge)[] = [];
  let direction: 'TB' | 'LR' | 'BT' | 'RL' | 'CIRCLE' = 'TB';
  let defaultStyle: any = {};

  // Remove comments
  const cleanText = text.replace(/\/\/.*/g, '').replace(/#.*/g, '');

  // 1. Parse Direction
  const directionRegex = /direction\s*:\s*(TB|LR|BT|RL|CIRCLE)/i;
  const dirMatch = cleanText.match(directionRegex);
  if (dirMatch) {
    direction = dirMatch[1].toUpperCase() as any;
  }

  // 2. Parse Standalone Styles (e.g. { stroke: red })
  const standaloneStyleRegex = /^\s*\{(.*?)\}\s*$/gm;
  let styleMatch;
  while ((styleMatch = standaloneStyleRegex.exec(cleanText)) !== null) {
    defaultStyle = { ...defaultStyle, ...parseStyles(styleMatch[1]) };
  }

  // 3. Parse Node Definitions
  // Matches: ID [Label] {Style} or ID (Label) ( {Style} )
  const nodeDefRegex = /(\w+)\s*(?:\[([\s\S]*?)\]|\(([\s\S]*?)\)|\{([\s\S]*?)\})(?:\s*(?:\{([\s\S]*?)\}|\(([\s\S]*?)\)))?/g;
  let nodeMatch;
  while ((nodeMatch = nodeDefRegex.exec(cleanText)) !== null) {
    const [, id, rectLabel, ellipseLabel, diamondLabel, style1, style2] = nodeMatch;
    let label = (rectLabel || ellipseLabel || diamondLabel || '').replace(/\\n/g, '\n');
    let type: NodeType = 'rectangle';
    if (diamondLabel !== undefined) type = 'diamond';
    if (ellipseLabel !== undefined) type = 'ellipse';
    
    const styleStr = style1 || style2 || '';
    
    const node: Node = { 
      id, 
      label: label.trim(), 
      type,
      style: { ...defaultStyle, ...parseStyles(styleStr) }
    };
    nodes.set(id, node);
  }

  // 4. Parse Edge Definitions
  // Matches: A -> B -> C : Label { style }
  const edgeLineRegex = /(\w+)\s*->\s*([\s\S]*?)(?=$|\n\w+\s*(?:\[|\(|\{)|$)/g;
  let edgeLineMatch;
  while ((edgeLineMatch = edgeLineRegex.exec(cleanText)) !== null) {
    const [, from, rest] = edgeLineMatch;
    
    // Split rest by -> but be careful with labels/styles
    // For simplicity, we split by -> and then parse each part
    const parts = rest.split('->').map(p => p.trim());
    let currentFrom = from;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // The last part might have a label and style: "C : Label { style }"
      const lastPartMatch = part.match(/^(\w+)(?:\s*[:]\s*([^{]*))?(?:\s*(?:\{(.*)\}|\((.*)\)))?$/);
      if (lastPartMatch) {
        const [, to, label, style1, style2] = lastPartMatch;
        const styleStr = style1 || style2 || '';
        
        if (!nodes.has(currentFrom)) {
          nodes.set(currentFrom, { id: currentFrom, label: currentFrom, type: 'rectangle', style: defaultStyle });
        }
        if (!nodes.has(to)) {
          nodes.set(to, { id: to, label: to, type: 'rectangle', style: defaultStyle });
        }
        
        const edge: Edge = { 
          from: currentFrom, 
          to, 
          label: label?.trim(),
          style: { ...defaultStyle, ...parseStyles(styleStr) }
        };
        edges.push(edge);
        currentFrom = to;
      }
    }
  }

  // Final elements list
  const finalNodes = Array.from(nodes.values());
  const finalElements: (Node | Edge)[] = [...finalNodes, ...edges];

  return {
    nodes: finalNodes,
    edges,
    elements: finalElements,
    direction
  };
}
