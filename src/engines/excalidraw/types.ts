export type NodeType = 'rectangle' | 'diamond' | 'ellipse';

export interface NodeStyle {
  stroke?: string;
  fill?: string;
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed';
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  icon?: string;
}

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: NodeStyle;
}

export interface Edge {
  from: string;
  to: string;
  label?: string;
  points?: { x: number; y: number }[];
  style?: {
    stroke?: string;
    strokeWidth?: number;
    roughness?: number;
    strokeLineDash?: number[];
  };
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  elements: (Node | Edge)[];
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
}