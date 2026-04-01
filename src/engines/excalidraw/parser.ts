import { Graph, Node, Edge, NodeType, NodeStyle } from './types';

function parseStyles(styleStr: string): any {
  if (!styleStr) return {};
  const styles: any = {};
  const pairs = styleStr.split(',').map(p => p.trim());
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
  const lines = text.split('\n');
  const nodes: Map<string, Node> = new Map();
  const edges: Edge[] = [];
  let direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB';

  // Improved regex: 
  // 1. ID
  // 2. Label in [], (), or {}
  // 3. Optional style block { key: value }
  const nodeDefRegex = /^(\w+)\s*(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})(?:\s*\{(.*)\})?$/;
  const edgeRegex = /^(\w+)\s*->\s*(\w+)(?:\s*[:]\s*([^{]*))?(?:\s*\{(.*)\})?$/;
  const directionRegex = /^direction\s*:\s*(TB|LR|BT|RL)$/i;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const dirMatch = line.match(directionRegex);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase() as any;
      continue;
    }

    const nodeMatch = line.match(nodeDefRegex);
    if (nodeMatch) {
      const [, id, rectLabel, ellipseLabel, diamondLabel, styleStr] = nodeMatch;
      let label = rectLabel || ellipseLabel || diamondLabel || '';
      let type: NodeType = 'rectangle';
      if (diamondLabel !== undefined) type = 'diamond';
      if (ellipseLabel !== undefined) type = 'ellipse';
      
      nodes.set(id, { 
        id, 
        label: label.trim(), 
        type,
        style: parseStyles(styleStr)
      });
      continue;
    }

    const edgeMatch = line.match(edgeRegex);
    if (edgeMatch) {
      const [, from, to, label, styleStr] = edgeMatch;
      
      // Ensure nodes exist
      if (!nodes.has(from)) nodes.set(from, { id: from, label: from, type: 'rectangle' });
      if (!nodes.has(to)) nodes.set(to, { id: to, label: to, type: 'rectangle' });
      
      edges.push({ 
        from, 
        to, 
        label: label?.trim(),
        style: parseStyles(styleStr)
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    direction
  };
}
