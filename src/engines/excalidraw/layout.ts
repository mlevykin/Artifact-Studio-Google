import dagre from 'dagre';
import { Graph, Node, Edge } from './types';

export function layoutGraph(graph: Graph): Graph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  for (const node of graph.nodes) {
    const width = Math.max(100, node.label.length * 10 + 20);
    const height = 50;
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
