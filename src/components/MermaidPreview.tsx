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
  const renderCount = useRef(0);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const currentStyle = useMemo(() => {
    return MERMAID_STYLES.find(s => s.id === styleId) || MERMAID_STYLES[0];
  }, [styleId]);

  // Initialize mermaid whenever style changes
  useEffect(() => {
    setIsInitialized(false);
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: currentStyle.theme as any,
        themeVariables: currentStyle.themeVariables,
        securityLevel: 'loose',
        fontFamily: currentStyle.themeVariables?.fontFamily || 'Inter, sans-serif',
        flowchart: { useMaxWidth: false },
        sequence: { useMaxWidth: false },
        class: { useMaxWidth: false },
        state: { useMaxWidth: false },
        er: { useMaxWidth: false },
        journey: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
        pie: { useMaxWidth: false },
        requirement: { useMaxWidth: false },
        mindmap: { useMaxWidth: false },
        timeline: { useMaxWidth: false },
        gitGraph: { useMaxWidth: false },
        c4: { useMaxWidth: false },
        quadrantChart: { useMaxWidth: false },
        xyChart: { useMaxWidth: false },
        block: { useMaxWidth: false },
        packet: { useMaxWidth: false },
        kanban: { useMaxWidth: false },
        architecture: { useMaxWidth: false },
      });
      setIsInitialized(true);
    } catch (err) {
      console.error('Mermaid initialization error:', err);
      // Fallback to basic initialization
      mermaid.initialize({ startOnLoad: false });
      setIsInitialized(true);
    }
  }, [currentStyle]);

  const isFullWidth = className?.includes('!w-full');

  // Use layout effect for immediate cache injection to prevent flicker
  useLayoutEffect(() => {
    if (containerRef.current && content) {
      const processedContent = content.trim().replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
      const cacheKey = `${styleId}-${isFullWidth ? 'full' : 'nat'}-${processedContent}`;
      if (mermaidRenderCache.has(cacheKey)) {
        containerRef.current.innerHTML = mermaidRenderCache.get(cacheKey)!;
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) svgElement.style.display = 'block';
      }
    }
  }, [content, styleId, isFullWidth]);

  useEffect(() => {
    if (!isInitialized) return;

    const renderDiagram = async () => {
      const currentRenderId = ++renderCount.current;
      
      if (containerRef.current && content) {
        let processedContent = content.trim();
        
        // Strip markdown code block wrappers if present
        if (processedContent.startsWith('```')) {
          const lines = processedContent.split('\n');
          if (lines[0].startsWith('```')) lines.shift();
          if (lines.length > 0 && lines[lines.length - 1].trim() === '```') lines.pop();
          processedContent = lines.join('\n').trim();
        }

        const cacheKey = `${styleId}-${isFullWidth ? 'full' : 'nat'}-${processedContent}`;
        
        // If we already injected from cache in useLayoutEffect, we can skip re-rendering
        // unless it's the very first render of this component instance
        if (mermaidRenderCache.has(cacheKey) && renderCount.current > 1) {
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
          
          // Validate syntax
          try {
            await mermaid.parse(processedContent);
          } catch (parseError: any) {
            if (content.length < 100 || !content.includes('\n')) return; 
            throw parseError;
          }

          const id = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
          const { svg } = await mermaid.render(id, processedContent);
          
          // Only update if this is still the most recent render request
          if (currentRenderId === renderCount.current && containerRef.current) {
            // Make SVG responsive: fit container but don't upscale beyond natural size
            const responsiveSvg = svg
              .replace(/max-width: [^;]+;/, '')
              .replace(/style="[^"]*max-width:[^"]*"/, '')
              .replace(/width="100%"/, '')
              .replace(/height="100%"/, '')
              .replace('<svg ', '<svg style="max-width: 100%; height: auto; display: block; margin: 0 auto;" ');
            
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
          if (currentRenderId === renderCount.current && containerRef.current) {
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
  }, [content, styleId, isInitialized, isFullWidth]);

  return (
    <div className={cn("relative w-full overflow-visible flex items-center justify-center p-4", className?.includes('!min-h-0') ? "h-auto" : "h-full")}>
      <style dangerouslySetInnerHTML={{ __html: currentStyle.css || '' }} />
      <div 
        ref={containerRef} 
        className={cn(
          "mermaid-container svg-preview-container p-8 shadow-sm rounded-lg flex items-center justify-center", 
          styleId,
          className
        )}
        style={{ 
          width: className?.includes('!w-full') ? 'auto' : (className?.includes('natural-size') ? 'auto' : '800px'), 
          maxWidth: '100%',
          minHeight: className?.includes('!min-h-0') ? '0' : '400px' 
        }}
      />
    </div>
  );
};
