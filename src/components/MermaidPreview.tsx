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
          let processedContent = content.trim();
          
          // Strip markdown code block wrappers if present
          if (processedContent.startsWith('```')) {
            const lines = processedContent.split('\n');
            // Remove first line if it starts with ```
            if (lines[0].startsWith('```')) {
              lines.shift();
            }
            // Remove last line if it's ```
            if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
              lines.pop();
            }
            processedContent = lines.join('\n').trim();
          }

          // Wrap unquoted labels containing parentheses in double quotes
          processedContent = processedContent.replace(/\[([^"\]]*\([^"\]]*\)[^"\]]*)\]/g, '["$1"]');
          
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, processedContent);
          if (containerRef.current) {
            // Remove fixed max-width and height from SVG to allow it to be scaled naturally
            const responsiveSvg = svg
              .replace(/max-width: [^;]+;/, '')
              .replace(/style="[^"]*max-width:[^"]*"/, '');
            
            containerRef.current.innerHTML = responsiveSvg;
            
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.display = 'block';
              // We don't set width 100% here because we want the natural size 
              // for ZoomableContainer to measure and scale
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
      className={cn("svg-preview-container bg-white p-8 shadow-sm rounded-lg flex items-center justify-center", className)}
      style={{ 
        width: className?.includes('!w-full') ? '100%' : '800px', 
        minHeight: className?.includes('!min-h-0') ? '0' : '400px' 
      }}
    />
  );
};
