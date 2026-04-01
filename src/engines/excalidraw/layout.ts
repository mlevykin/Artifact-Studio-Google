import dagre from 'dagre';
import { Graph, Node, Edge } from './types';

export function layoutGraph(graph: Graph): Graph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ 
    rankdir: 'TB', 
    marginx: 40, 
    marginy: 40,
    nodesep: 120,
    ranksep: 140
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  for (const node of graph.nodes) {
    // Better width calculation to avoid text touching borders
    const width = Math.max(120, node.label.length * 12 + 40);
    const height = 60;
    g.setNode(node.id, { width, height });
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

  return { nodes, edges };
}
