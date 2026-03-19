import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { cn } from '../utils';

interface MermaidPreviewProps {
  content: string;
  theme?: string;
  className?: string;
}

export const MermaidPreview: React.FC<MermaidPreviewProps> = ({ content, theme = 'default', className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme as any,
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
    });
  }, [theme]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current && content) {
        try {
          containerRef.current.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, content);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          containerRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded bg-red-50 text-xs font-mono">
            Error rendering diagram. Please check syntax.
          </div>`;
        }
      }
    };

    renderDiagram();
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full flex items-center justify-center overflow-auto bg-white p-4", className)}
    />
  );
};
