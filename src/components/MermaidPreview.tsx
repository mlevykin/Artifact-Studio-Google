import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { cn } from '../utils';
import { MERMAID_STYLES } from '../constants/mermaidStyles';
import { getMermaidNodes } from '../engines/mermaid/parser';

interface MermaidPreviewProps {
  content: string;
  styleId?: string;
  className?: string;
  step?: number;
}

// Global cache to prevent flickering on remounts/resizes
const mermaidRenderCache = new Map<string, string>();

export const MermaidPreview: React.FC<MermaidPreviewProps> = React.memo(({ content, styleId = 'minimalist', className, step }) => {
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
        themeVariables: {
          ...currentStyle.themeVariables,
          fontSize: currentStyle.themeVariables?.fontSize || '14px',
        },
        // Some mermaid versions use top-level fontSize
        fontSize: parseInt(currentStyle.themeVariables?.fontSize || '14px'),
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
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'neutral',
        themeVariables: { fontSize: '14px' }
      });
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
          // Even if we skip re-render, we might need to apply step visibility
          applyStepVisibility(processedContent);
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
            // We keep the original width/height if they are absolute to prevent stretching
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
            
            applyStepVisibility(processedContent);
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

    function applyStepVisibility(cleanedContent: string) {
      if (containerRef.current) {
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          // Select nodes and edges more comprehensively
          const nodes = Array.from(svg.querySelectorAll('.node, .actor, .cluster, .state, .er.entityBox'));
          const edges = Array.from(svg.querySelectorAll('.edgePath, .edge-paths, .messageLine, .messageText, .loop, .note, .relation, .transition, .edgeLabels, .edge-thickness-normal, .edge-thickness-thick, .edge-thickness-thin, [class^="L-"], [class*=" L-"]'));
          
          if (step !== undefined) {
            // At step 0, hide EVERYTHING
            if (step === 0) {
              [...nodes, ...edges].forEach(el => {
                (el as HTMLElement).style.opacity = '0';
                (el as HTMLElement).style.pointerEvents = 'none';
                (el as HTMLElement).style.transition = 'opacity 0.3s ease-in-out';
              });
              return;
            }

            const isSequence = cleanedContent.toLowerCase().includes('sequencediagram');
            
            if (isSequence) {
              // Sequence diagram logic: steps are messages
              // Actors are usually always visible or we can show them as they appear
              edges.forEach((edge, index) => {
                const isVisible = index < step;
                (edge as HTMLElement).style.opacity = isVisible ? '1' : '0';
                (edge as HTMLElement).style.pointerEvents = isVisible ? 'auto' : 'none';
                (edge as HTMLElement).style.transition = 'opacity 0.3s ease-in-out';
              });
              return;
            }

            // Flowchart/Graph logic: steps are nodes
            const orderedNodeIds = getMermaidNodes(cleanedContent);
            const visibleNodeIds = new Set(orderedNodeIds.slice(0, step));
            
            // Helper to get ID from mermaid SVG element
            const getElementId = (el: Element) => {
              const classList = Array.from(el.classList);
              
              // 1. Check for id-NODEID class (most reliable in modern Mermaid)
              const idClass = classList.find(c => c.startsWith('id-'));
              if (idClass) return idClass.substring(3);
              
              // 2. Check for L-NODEID class
              const lClass = classList.find(c => c.startsWith('L-'));
              if (lClass) return lClass.substring(2);

              // 3. Check element ID
              const id = el.id;
              if (id) {
                // flowchart-A-123 -> A
                // We try to find which orderedNodeId is contained in this ID
                const matchingNodeId = orderedNodeIds.find(nodeId => 
                  id === nodeId || id.includes(`-${nodeId}-`) || id.endsWith(`-${nodeId}`)
                );
                if (matchingNodeId) return matchingNodeId;
              }
              
              return null;
            };

            // Hide/show nodes
            nodes.forEach((node) => {
              const nodeId = getElementId(node);
              // If we can't find an ID, we default to visible to avoid "empty" diagrams
              const isVisible = nodeId ? visibleNodeIds.has(nodeId) : true;
              
              (node as HTMLElement).style.opacity = isVisible ? '1' : '0';
              (node as HTMLElement).style.pointerEvents = isVisible ? 'auto' : 'none';
              (node as HTMLElement).style.transition = 'opacity 0.3s ease-in-out';
            });

            // Hide/show edges
            edges.forEach((edge) => {
              const edgeEl = edge as HTMLElement;
              const classList = Array.from(edgeEl.classList);
              
              // Find all nodes this edge is connected to (Mermaid uses L-nodeId classes)
              const connectedNodeClasses = classList.filter(cls => cls.startsWith('L-'));
              const connectedNodeIds = connectedNodeClasses.map(cls => cls.substring(2));
              
              // If we found connected nodes, check their visibility
              if (connectedNodeIds.length > 0) {
                const allConnectedNodesVisible = connectedNodeIds.every(id => visibleNodeIds.has(id));
                edgeEl.style.opacity = allConnectedNodesVisible ? '1' : '0';
                edgeEl.style.pointerEvents = allConnectedNodesVisible ? 'auto' : 'none';
              } else {
                // If no connected node classes found, it might be a sequence diagram message or something else
                // For non-sequence diagrams, we should be conservative
                if (!isSequence) {
                  // Try to find node IDs in the element's ID or classes as a fallback
                  const id = edgeEl.id || '';
                  const foundNodes = orderedNodeIds.filter(nodeId => 
                    id.includes(`-${nodeId}-`) || id.startsWith(`${nodeId}-`) || id.endsWith(`-${nodeId}`) ||
                    classList.some(cls => cls === nodeId || cls.includes(`-${nodeId}-`))
                  );
                  
                  if (foundNodes.length > 0) {
                    const allVisible = foundNodes.every(nodeId => visibleNodeIds.has(nodeId));
                    edgeEl.style.opacity = allVisible ? '1' : '0';
                    edgeEl.style.pointerEvents = allVisible ? 'auto' : 'none';
                  } else {
                    // Default to hidden for flowchart edges if we can't prove they should be visible
                    edgeEl.style.opacity = '0';
                    edgeEl.style.pointerEvents = 'none';
                  }
                } else {
                  // Sequence diagram: default to visible (handled by index check above)
                  edgeEl.style.opacity = '1';
                  edgeEl.style.pointerEvents = 'auto';
                }
              }
              edgeEl.style.transition = 'opacity 0.3s ease-in-out';
            });
          } else {
            [...nodes, ...edges].forEach((el) => {
              (el as HTMLElement).style.opacity = '1';
              (el as HTMLElement).style.pointerEvents = 'auto';
            });
          }
        }
      }
    }

    renderDiagram();
  }, [content, styleId, isInitialized, isFullWidth, step]);
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
          width: className?.includes('!w-full') ? '100%' : 'auto', 
          maxWidth: className?.includes('!w-full') ? 'none' : '800px',
          minHeight: className?.includes('!min-h-0') ? '0' : '100px' 
        }}
      />
    </div>
  );
});

MermaidPreview.displayName = 'MermaidPreview';
