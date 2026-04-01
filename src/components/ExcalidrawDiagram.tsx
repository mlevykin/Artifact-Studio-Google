import React, { useMemo } from 'react';
import { parseExcalidraw } from '../engines/excalidraw/parser';
import { layoutGraph } from '../engines/excalidraw/layout';
import { ExcalidrawRenderer } from '../engines/excalidraw/renderer';

interface ExcalidrawDiagramProps {
  code: string;
}

export const ExcalidrawDiagram: React.FC<ExcalidrawDiagramProps> = ({ code }) => {
  const graph = useMemo(() => {
    try {
      const parsed = parseExcalidraw(code);
      return layoutGraph(parsed);
    } catch (error) {
      console.error('Failed to parse or layout Excalidraw diagram:', error);
      return { nodes: [], edges: [] };
    }
  }, [code]);

  if (graph.nodes.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm">
        Failed to render Excalidraw diagram. Please check the syntax.
      </div>
    );
  }

  return <ExcalidrawRenderer graph={graph} />;
};
