import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import dagre from 'dagre';

interface BananaNode {
  id: string;
  label: string;
  type: 'process' | 'decision' | 'start' | 'end';
}

interface BananaEdge {
  from: string;
  to: string;
  label?: string;
}

interface BananaData {
  title?: string;
  description?: string;
  nodes: BananaNode[];
  edges: BananaEdge[];
}

interface BananaRendererProps {
  content: string;
}

export const BananaRenderer: React.FC<BananaRendererProps> = ({ content }) => {
  const data = useMemo(() => {
    try {
      return JSON.parse(content) as BananaData;
    } catch (e) {
      console.error('Failed to parse banana-json:', e);
      return null;
    }
  }, [content]);

  const layout = useMemo(() => {
    if (!data) return null;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', marginx: 40, marginy: 40, nodesep: 60, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    data.nodes.forEach(node => {
      // Approximate dimensions based on label length
      const width = Math.max(160, node.label.length * 10);
      const height = node.type === 'decision' ? 80 : 60;
      g.setNode(node.id, { width, height, label: node.label, type: node.type });
    });

    data.edges.forEach(edge => {
      g.setEdge(edge.from, edge.to);
    });

    dagre.layout(g);
    return g;
  }, [data]);

  if (!data || !layout) {
    return (
      <div className="p-8 text-center text-zinc-400 font-medium">
        Invalid Banana JSON structure
      </div>
    );
  }

  const nodes = layout.nodes().map(v => {
    const node = layout.node(v);
    return { 
      id: v, 
      ...node,
      type: (node as any).type as BananaNode['type']
    };
  });
  const edges = layout.edges().map(e => ({ 
    ...e, 
    ...layout.edge(e),
    points: layout.edge(e).points 
  }));

  const graphInfo = layout.graph();

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-auto p-8">
      {data.title && (
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{data.title}</h2>
          {data.description && <p className="text-zinc-500 mt-1 text-sm">{data.description}</p>}
        </div>
      )}
      
      <div className="flex-1 flex justify-center">
        <svg 
          width={graphInfo.width} 
          height={graphInfo.height}
          viewBox={`0 0 ${graphInfo.width} ${graphInfo.height}`}
          className="max-w-full h-auto"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#555555" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const points = edge.points.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <motion.path
                key={`${edge.v}-${edge.w}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                d={`M ${edge.points[0].x} ${edge.points[0].y} ${edge.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke="#555555"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isDecision = node.type === 'decision';
            const isStartEnd = node.type === 'start' || node.type === 'end';
            
            let fill = '#f0f4ff';
            let stroke = '#4a6fa5';
            
            if (isDecision) {
              fill = '#fff8e1';
              stroke = '#c9a227';
            } else if (isStartEnd) {
              fill = '#f0fdf4';
              stroke = '#166534';
            }

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 100, delay: i * 0.05 }}
                transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
              >
                {isDecision ? (
                  <polygon
                    points={`0,${node.height / 2} ${node.width / 2},0 ${node.width},${node.height / 2} ${node.width / 2},${node.height}`}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    className="shadow-sm"
                  />
                ) : (
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={isStartEnd ? node.height / 2 : 8}
                    ry={isStartEnd ? node.height / 2 : 8}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    className="shadow-sm"
                  />
                )}
                <text
                  x={node.width / 2}
                  y={node.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-zinc-900 font-medium text-[13px] pointer-events-none"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {node.label}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
