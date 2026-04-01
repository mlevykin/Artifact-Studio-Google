import { Graph, Node, Edge, NodeType, NodeStyle } from './types';

function parseStyles(styleStr: string): any {
  if (!styleStr) return {};
  const styles: any = {};
  const pairs = styleStr.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(p => p.trim());
    if (key && value) {
      // Convert numeric values
      if (!isNaN(Number(value))) {
        styles[key] = Number(value);
      } else {
        styles[key] = value;
      }
    }
  }
  return styles;
}

export function parseExcalidraw(text: string): Graph {
  const lines = text.split('\n');
  const nodes: Map<string, Node> = new Map();
  const edges: Edge[] = [];

  // Improved regex: 
  // 1. ID
  // 2. Opening bracket [({
  // 3. Label (everything until the closing bracket)
  // 4. Closing bracket ])}
  // 5. Optional style block { key: value }
  const nodeDefRegex = /^(\w+)\s*([\[\{\(])(.*?)([\]\}\)])(?:\s*\{(.*)\})?$/;
  const edgeRegex = /^(\w+)\s*->\s*(\w+)(?:\s*[:]\s*([^{]*))?(?:\s*\{(.*)\})?$/;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const nodeMatch = line.match(nodeDefRegex);
    if (nodeMatch) {
      const [, id, open, label, close, styleStr] = nodeMatch;
      let type: NodeType = 'rectangle';
      if (open === '{' && close === '}') type = 'diamond';
      if (open === '(' && close === ')') type = 'ellipse';
      
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
    edges
  };
}
