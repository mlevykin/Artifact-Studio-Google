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
          
          // Pre-process content to fix common syntax errors
          // Wrap unquoted labels containing parentheses in double quotes
          let processedContent = content;
          processedContent = processedContent.replace(/\[([^"\]]*\([^"\]]*\)[^"\]]*)\]/g, '["$1"]');
          
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, processedContent);
          if (containerRef.current) {
            // Remove fixed max-width from SVG to allow it to fill the container
            const responsiveSvg = svg.replace(/max-width: [^;]+;/, 'max-width: 100%;');
            containerRef.current.innerHTML = responsiveSvg;
            
            // Ensure SVG itself is responsive
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.display = 'block';
            }
          }
        } catch (error: any) {
          console.error('Mermaid render error:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="text-red-500 p-4 border border-red-200 rounded bg-red-50 text-xs font-mono">
                <div class="font-bold mb-2">Mermaid Render Error</div>
                <pre class="whitespace-pre-wrap">${error?.message || 'Unknown error'}</pre>
              </div>
            `;
          }
        }
      }
    };

    renderDiagram();
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={cn("bg-white p-8 shadow-sm rounded-lg min-w-[400px]", className)}
    />
  );
};
