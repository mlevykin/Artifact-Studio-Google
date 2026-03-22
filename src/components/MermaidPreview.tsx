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
        // Basic check for valid mermaid content
        const isPotentiallyValid = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|xychart|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packetBeta|kanban|architecture|requirementDiagram)/i.test(content.trim().replace(/^```mermaid\n?/, ''));

        if (!isPotentiallyValid && content.length < 20) {
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="flex items-center justify-center p-8 text-zinc-400 text-xs animate-pulse">Initializing diagram...</div>';
          }
          return;
        }

        try {
          // Pre-process content to fix common syntax errors
          let processedContent = content.trim();
          
          // Strip markdown code block wrappers if present
          if (processedContent.startsWith('```')) {
            const lines = processedContent.split('\n');
            if (lines[0].startsWith('```')) {
              lines.shift();
            }
            if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
              lines.pop();
            }
            processedContent = lines.join('\n').trim();
          }

          // Wrap unquoted labels containing parentheses in double quotes
          processedContent = processedContent.replace(/\[([^"\]]*\([^"\]]*\)[^"\]]*)\]/g, '["$1"]');
          
          // Try to parse first to avoid noisy errors during streaming
          try {
            await mermaid.parse(processedContent);
          } catch (parseError) {
            // If it's short or doesn't have a closing tag/structure, it's likely just streaming
            if (content.length < 100 || !content.includes('\n')) {
               if (containerRef.current && containerRef.current.innerHTML === '') {
                 containerRef.current.innerHTML = '<div class="flex items-center justify-center p-8 text-zinc-400 text-xs">Rendering diagram...</div>';
               }
               return; 
            }
            throw parseError;
          }

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
            }
          }
        } catch (error: any) {
          // Only show error if it's not a common streaming-related syntax error or if content is long enough
          const isStreamingError = error?.message?.includes('Parse error') || error?.message?.includes('Syntax error');
          
          if (isStreamingError && content.length < 200) {
            // Keep previous content or show loading if it's likely just incomplete
            return;
          }

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
        width: className?.includes('!w-full') ? '100%' : (className?.includes('natural-size') ? 'auto' : '800px'), 
        minHeight: className?.includes('!min-h-0') ? '0' : '400px' 
      }}
    />
  );
};
