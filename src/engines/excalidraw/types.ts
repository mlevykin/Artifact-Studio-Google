export type NodeType = 'rectangle' | 'diamond' | 'ellipse';

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Edge {
  from: string;
  to: string;
  label?: string;
  points?: { x: number; y: number }[];
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}
