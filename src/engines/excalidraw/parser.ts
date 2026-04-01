import { Graph, Node, Edge, NodeType } from './types';

export function parseExcalidraw(text: string): Graph {
  const lines = text.split('\n');
  const nodes: Map<string, Node> = new Map();
  const edges: Edge[] = [];

  const nodeDefRegex = /^(\w+)\s*([\[\{\(])(.*)([\]\}\)])$/;
  const edgeRegex = /^(\w+)\s*->\s*(\w+)(?:\s*[:]\s*(.*))?$/;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const nodeMatch = line.match(nodeDefRegex);
    if (nodeMatch) {
      const [, id, open, label, close] = nodeMatch;
      let type: NodeType = 'rectangle';
      if (open === '{' && close === '}') type = 'diamond';
      if (open === '(' && close === ')') type = 'ellipse';
      
      nodes.set(id, { id, label: label.trim(), type });
      continue;
    }

    const edgeMatch = line.match(edgeRegex);
    if (edgeMatch) {
      const [, from, to, label] = edgeMatch;
      
      // Ensure nodes exist
      if (!nodes.has(from)) nodes.set(from, { id: from, label: from, type: 'rectangle' });
      if (!nodes.has(to)) nodes.set(to, { id: to, label: to, type: 'rectangle' });
      
      edges.push({ from, to, label: label?.trim() });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}
