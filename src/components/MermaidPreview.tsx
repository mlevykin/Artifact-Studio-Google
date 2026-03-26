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

  const processMermaidContent = (rawContent: string) => {
    let processed = rawContent.trim();
    if (processed.startsWith('```')) {
      const lines = processed.split('\n');
      if (lines[0].startsWith('```')) lines.shift();
      if (lines.length > 0 && lines[lines.length - 1].trim() === '```') lines.pop();
      processed = lines.join('\n').trim();
    }
    return processed;
  };

  useLayoutEffect(() => {
    if (containerRef.current && content) {
      const processedContent = processMermaidContent(content);
      const cacheKey = `${styleId}-${processedContent}`;
      if (mermaidRenderCache.has(cacheKey)) {
        containerRef.current.innerHTML = mermaidRenderCache.get(cacheKey)!;
      }
    }
  }, [content, styleId]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !content) return;

      const processedContent = processMermaidContent(content);
      const cacheKey = `${styleId}-${processedContent}`;
      
      // If we have it in cache, we already injected it in useLayoutEffect
      if (mermaidRenderCache.has(cacheKey)) {
        return;
      }

      // Basic check for valid mermaid content - simplified
      if (processedContent.length < 5) return;

      try {
        // Initialize mermaid with current style before rendering
        mermaid.initialize({
          startOnLoad: false, // Changed to false as we call render manually
          theme: currentStyle.theme as any,
          themeVariables: currentStyle.themeVariables,
          securityLevel: 'loose',
          fontFamily: currentStyle.themeVariables?.fontFamily || 'Inter, sans-serif',
        });

        // Wrap unquoted labels containing parentheses in double quotes
        const finalContent = processedContent.replace(/\[([^"\]]*\([^"\]]*\)[^"\]]*)\]/g, '["$1"]');
        
        // Try to parse first to avoid noisy errors during streaming
        try {
          await mermaid.parse(finalContent);
        } catch (parseError: any) {
          if (content.length < 100 || !content.includes('\n')) {
             if (containerRef.current && containerRef.current.innerHTML === '') {
               containerRef.current.innerHTML = '<div class="flex items-center justify-center p-8 text-zinc-400 text-xs">Rendering diagram...</div>';
             }
             return; 
          }
          throw parseError;
        }

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, finalContent);
        
        if (containerRef.current) {
          // Extract original width to prevent over-scaling
          const widthMatch = svg.match(/width="([\d.]+)"/);
          const originalWidth = widthMatch ? widthMatch[1] : null;
          
          // Make SVG responsive but respect its natural size for small diagrams
          let responsiveSvg = svg
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/height="[^"]*"/, 'height="auto"')
            .replace(/style="[^"]*max-width:[^"]*"/, (match) => {
              return match.replace(/max-width:\s*[^;"]+/, 'max-width: 100%');
            });
          
          mermaidRenderCache.set(cacheKey, responsiveSvg);
          containerRef.current.innerHTML = responsiveSvg;
          
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.display = 'block';
            svgElement.style.margin = 'auto';
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
            
            if (originalWidth) {
              svgElement.style.maxWidth = `${originalWidth}px`;
            } else {
              svgElement.style.maxWidth = '100%';
            }
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
    };

    renderDiagram();
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
