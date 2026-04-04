import dagre from 'dagre';
import { Graph, Node, Edge } from './types';

function wrapText(text: string, maxCharsPerLine: number): string {
  return text.split('\n').map(segment => {
    const words = segment.split(' ');
    let currentLine = '';
    const lines = [];

    for (const word of words) {
      if (currentLine.length + word.length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines.join('\n');
  }).join('\n');
}

export function layoutGraph(graph: Graph): Graph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ 
    rankdir: graph.direction || 'TB', 
    marginx: 20, 
    marginy: 20,
    nodesep: 60,
    ranksep: 80
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  for (const node of graph.nodes) {
    let label = node.label;
    
    // If the label is long, wrap it to aim for square-ish shape
    // Threshold for wrapping: if single line is > 20 chars
    const originalLines = label.split('\n');
    const longestOriginalLine = Math.max(...originalLines.map(l => l.length));
    
    if (longestOriginalLine > 20) {
      // Aim for a width of about 20-25 characters
      label = wrapText(label, 22);
    }
    
    const lines = label.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));
    
    // Aim for more square-like proportions
    let width = Math.max(100, maxLineLength * 10 + 40);
    if (node.style?.icon) {
      width += 30; // Extra space for icon
    }
    
    const height = Math.max(60, lines.length * 20 + 30);
    g.setNode(node.id, { width, height, label });
  }

  // Add edges to dagre
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to);
  }

  // Compute layout
  dagre.layout(g);

  // Update graph with positions
  const nodes = graph.nodes.map(node => {
    const n = g.node(node.id);
    return {
      ...node,
      label: n.label || node.label,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height
    };
  });

  const edges = graph.edges.map(edge => {
    const e = g.edge(edge.from, edge.to);
    return {
      ...edge,
      points: e.points || []
    };
  });

  // Reconstruct elements with updated node/edge data
  const elements = graph.elements.map(el => {
    if ('from' in el) {
      // It's an edge
      return edges.find(e => e.from === el.from && e.to === el.to) || el;
    } else {
      // It's a node
      return nodes.find(n => n.id === el.id) || el;
    }
  });

  return { nodes, edges, elements, direction: graph.direction };
}
