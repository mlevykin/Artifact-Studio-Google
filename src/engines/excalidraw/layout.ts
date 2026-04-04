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
  // Common node size calculation
  const nodesWithSizes = graph.nodes.map(node => {
    let label = node.label;
    const originalLines = label.split('\n');
    const longestOriginalLine = Math.max(...originalLines.map(l => l.length));
    
    if (longestOriginalLine > 20) {
      label = wrapText(label, 22);
    }
    
    const lines = label.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));
    
    let width = Math.max(100, maxLineLength * 10 + 40);
    if (node.style?.icon) {
      width += 30;
    }
    
    const height = Math.max(60, lines.length * 20 + 30);
    return { ...node, width, height, label };
  });

  if (graph.direction === 'CIRCLE') {
    const radius = Math.max(250, nodesWithSizes.length * 80);
    const centerX = 0;
    const centerY = 0;
    
    const positionedNodes = nodesWithSizes.map((node, i) => {
      const angle = (i / nodesWithSizes.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    const edges = graph.edges.map(edge => {
      const fromNode = positionedNodes.find(n => n.id === edge.from);
      const toNode = positionedNodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        // For circular layout, we can use a simple straight line or a curve
        // Let's use points that dagre would expect
        return {
          ...edge,
          points: [
            { x: fromNode.x!, y: fromNode.y! },
            { x: toNode.x!, y: toNode.y! }
          ]
        };
      }
      return edge;
    });

    const elements = graph.elements.map(el => {
      if ('from' in el) {
        return edges.find(e => e.from === el.from && e.to === el.to) || el;
      } else {
        return positionedNodes.find(n => n.id === el.id) || el;
      }
    });

    return { nodes: positionedNodes, edges, elements, direction: graph.direction };
  }

  // Hierarchical layout (dagre)
  const g = new dagre.graphlib.Graph();
  g.setGraph({ 
    rankdir: graph.direction || 'TB', 
    marginx: 20, 
    marginy: 20,
    nodesep: 60,
    ranksep: 80
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodesWithSizes) {
    g.setNode(node.id, { width: node.width, height: node.height, label: node.label });
  }

  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  const nodes = nodesWithSizes.map(node => {
    const n = g.node(node.id);
    return {
      ...node,
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

  const elements = graph.elements.map(el => {
    if ('from' in el) {
      return edges.find(e => e.from === el.from && e.to === el.to) || el;
    } else {
      return nodes.find(n => n.id === el.id) || el;
    }
  });

  return { nodes, edges, elements, direction: graph.direction };
}
