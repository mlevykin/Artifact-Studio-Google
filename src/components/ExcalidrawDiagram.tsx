import React, { useMemo } from 'react';
import { parseExcalidraw } from '../engines/excalidraw/parser';
import { layoutGraph } from '../engines/excalidraw/layout';
import { ExcalidrawRenderer } from '../engines/excalidraw/renderer';

interface ExcalidrawDiagramProps {
  code: string;
  step?: number;
}

export const ExcalidrawDiagram: React.FC<ExcalidrawDiagramProps> = ({ code, step }) => {
  const graph = useMemo(() => {
    try {
      const parsed = parseExcalidraw(code);
      // If nodes already have positions (native JSON), skip layout
      const hasPositions = parsed.nodes.length > 0 && parsed.nodes.every(n => n.x !== undefined && n.y !== undefined);
      if (hasPositions) {
        return parsed;
      }
      return layoutGraph(parsed);
    } catch (error) {
      console.error('Failed to parse or layout Excalidraw diagram:', error);
      return { nodes: [], edges: [], elements: [] };
    }
  }, [code]);

  if (graph.nodes.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm">
        Failed to render Excalidraw diagram. Please check the syntax.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl p-4 sm:p-8 border border-slate-200/60 shadow-inner">
      <ExcalidrawRenderer graph={graph} step={step} />
    </div>
  );
};
