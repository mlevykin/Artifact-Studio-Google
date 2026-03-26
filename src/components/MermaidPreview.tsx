import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { cn } from '../utils';
import { MERMAID_STYLES } from '../constants/mermaidStyles';

interface MermaidPreviewProps {
  content: string;
  styleId?: string;
  className?: string;
}

// Global cache to prevent flickering on remounts/resizes
const mermaidRenderCache = new Map<string, string>();

export const MermaidPreview: React.FC<MermaidPreviewProps> = ({ content, styleId = 'minimalist', className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  const currentStyle = useMemo(() => {
    return MERMAID_STYLES.find(s => s.id === styleId) || MERMAID_STYLES[0];
  }, [styleId]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: currentStyle.theme as any,
      themeVariables: currentStyle.themeVariables,
      securityLevel: 'loose',
      fontFamily: currentStyle.themeVariables?.fontFamily || 'Inter, sans-serif',
    });
  }, [currentStyle]);

  useLayoutEffect(() => {
    if (containerRef.current && content) {
      const processedContent = content.trim().replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
      const cacheKey = `${styleId}-${processedContent}`;
      if (mermaidRenderCache.has(cacheKey)) {
        containerRef.current.innerHTML = mermaidRenderCache.get(cacheKey)!;
      }
    }
  }, [content, styleId]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current && content) {
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

        const cacheKey = `${styleId}-${processedContent}`;
        
        // If we have it in cache, we already injected it in useLayoutEffect
        if (mermaidRenderCache.has(cacheKey)) {
          return;
        }

        // Basic check for valid mermaid content
        const isPotentiallyValid = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|xychart|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packetBeta|kanban|architecture|requirementDiagram)/i.test(processedContent);

        if (!isPotentiallyValid && processedContent.length < 20) {
          if (containerRef.current && containerRef.current.innerHTML === '') {
            containerRef.current.innerHTML = '<div class="flex items-center justify-center p-8 text-zinc-400 text-xs animate-pulse">Initializing diagram...</div>';
          }
          return;
        }

        try {
          // Wrap unquoted labels containing parentheses in double quotes
          processedContent = processedContent.replace(/\[([^"\]]*\([^"\]]*\)[^"\]]*)\]/g, '["$1"]');
          
          // Try to parse first to avoid noisy errors during streaming
          try {
            await mermaid.parse(processedContent);
          } catch (parseError: any) {
            // Check for common unsupported types
            if (processedContent.toLowerCase().includes('usecasediagram')) {
              if (containerRef.current) {
                containerRef.current.innerHTML = `
                  <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs">
                    <p class="font-bold mb-1">Mermaid Render Error</p>
                    <p>'useCaseDiagram' is not supported by Mermaid. Please use 'graph TD' or 'flowchart TD' instead.</p>
                  </div>
                `;
              }
              return;
            }

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
            const responsiveSvg = svg
              .replace(/max-width: [^;]+;/, '')
              .replace(/style="[^"]*max-width:[^"]*"/, '');
            
            mermaidRenderCache.set(cacheKey, responsiveSvg);
            containerRef.current.innerHTML = responsiveSvg;
            
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.display = 'block';
            }
          }
        } catch (error: any) {
          const isStreamingError = error?.message?.includes('Parse error') || error?.message?.includes('Syntax error');
          if (isStreamingError && content.length < 200) return;

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
    isInitialRender.current = false;
  }, [content, styleId, currentStyle]);

  return (
    <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{ __html: currentStyle.css || '' }} />
      <div 
        ref={containerRef} 
        className={cn(
          "mermaid-container svg-preview-container p-8 shadow-sm rounded-lg flex items-center justify-center transition-all duration-300", 
          styleId,
          className
        )}
        style={{ 
          width: className?.includes('!w-full') ? '100%' : (className?.includes('natural-size') ? 'auto' : '800px'), 
          minHeight: className?.includes('!min-h-0') ? '0' : '400px' 
        }}
      />
    </div>
  );
};
