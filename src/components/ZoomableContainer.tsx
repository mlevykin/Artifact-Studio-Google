import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Maximize } from 'lucide-react';
import { cn } from '../utils';

interface ZoomableContainerProps {
  children: React.ReactNode;
  className?: string;
  fitMode?: 'both' | 'width';
  contentId?: string | number;
  isStreaming?: boolean;
}

export const ZoomableContainer: React.FC<ZoomableContainerProps> = ({ 
  children, 
  className,
  fitMode = 'both',
  contentId,
  isStreaming = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastZoomTime = useRef(0);

  const isDocMode = fitMode === 'width';

  // Use refs to avoid re-attaching wheel listener too often
  const stateRef = useRef({ zoom, position, containerWidth, containerHeight, contentWidth });
  
  // Update ref immediately when state changes to avoid stale closures in event handlers
  const updateStateRef = useCallback((updates: Partial<typeof stateRef.current>) => {
    stateRef.current = { ...stateRef.current, ...updates };
  }, []);

  useEffect(() => {
    updateStateRef({ zoom, position, containerWidth, containerHeight, contentWidth });
  }, [zoom, position, containerWidth, containerHeight, contentWidth, updateStateRef]);

  const hasInteractedRef = useRef(false);
  const [hasInteracted, setHasInteractedState] = useState(false);
  const setHasInteracted = (val: boolean) => {
    hasInteractedRef.current = val;
    setHasInteractedState(val);
    if (val) {
      initialFitDone.current = true; // If user interacts, we consider the "initial" state done
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
        fitTimeoutRef.current = null;
      }
    }
  };

  const initialFitDone = useRef(false);
  const lastContentId = useRef<string | number | undefined>(undefined);

  // Reset initial fit state when contentId changes (new version)
  useEffect(() => {
    if (contentId !== lastContentId.current) {
      initialFitDone.current = false;
      setHasInteracted(false);
      lastContentId.current = contentId;
    }
  }, [contentId]);

  useLayoutEffect(() => {
    // No longer needed with unified position-based zoom
  });

  const handleZoom = useCallback((newZoom: number, focalPoint: { x: number, y: number } | null) => {
    const { zoom: currentZoom, position: currentPos, containerWidth: cW, containerHeight: cH } = stateRef.current;
    if (!containerRef.current) return;
    
    const mouseX = focalPoint ? focalPoint.x : cW / 2;
    const mouseY = focalPoint ? focalPoint.y : cH / 2;

    // 1. Determine where on the document the mouse is (unscaled coordinates)
    // Since transform-origin is 0,0, this is very simple:
    const relX = (mouseX - currentPos.x) / currentZoom;
    const relY = (mouseY - currentPos.y) / currentZoom;

    // 2. Calculate new position to keep that point under the mouse
    const newX = mouseX - relX * newZoom;
    const newY = mouseY - relY * newZoom;

    console.log(`ZOOM_LOG | Mode: ${isDocMode ? 'DOC' : 'DIAG'} | Zoom: ${currentZoom.toFixed(3)}->${newZoom.toFixed(3)} | Mouse: [${mouseX}, ${mouseY}] | Pos: [${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}] -> [${newX.toFixed(1)}, ${newY.toFixed(1)}] | Rel: [${relX.toFixed(1)}, ${relY.toFixed(1)}]`);

    setZoom(newZoom);
    setPosition({ x: newX, y: newY });
    updateStateRef({ zoom: newZoom, position: { x: newX, y: newY } });

    lastZoomTime.current = Date.now();
  }, [isDocMode]);

  const handleWheel = useCallback((e: WheelEvent) => {
    setHasInteracted(true);
    // If fitMode is 'width', we want to allow normal scrolling unless Ctrl is pressed
    const isZoomAction = e.ctrlKey || e.metaKey || (!isDocMode && fitMode === 'both');
    
    if (isZoomAction) {
      e.preventDefault();
      
      // Standardize delta
      const delta = Math.max(Math.min(-e.deltaY, 1000), -1000);
      const factor = Math.pow(1.1, delta / 100);
      const { zoom: currentZoom } = stateRef.current;
      
      // Expanded zoom range
      const newZoom = Math.min(Math.max(currentZoom * factor, 0.001), 100);
      
      if (newZoom !== currentZoom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        handleZoom(newZoom, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      // Normal scrolling
      if (isDocMode) {
        // Simulate scrolling by moving the position
        setPosition(prev => ({
          ...prev,
          y: prev.y - e.deltaY
        }));
      } else if (fitMode === 'width') {
        setPosition(prev => ({
          ...prev,
          y: prev.y - e.deltaY
        }));
      }
    }
  }, [fitMode, isDocMode, handleZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setHasInteracted(true);
    // Pan with middle button (1)
    if (e.button === 1) {
      setIsDragging(true);
      e.preventDefault();
      return;
    }

    // Pan with left button (0) if panMode is active or modifier keys are pressed
    if (e.button === 0 && (e.altKey || e.shiftKey || panMode)) {
      setIsDragging(true);
      e.preventDefault();
      return;
    }

    // If left click on the BACKGROUND (not on content), we still want to pan
    if (e.button === 0 && e.target === containerRef.current) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDocMode]);

  const resetZoom = () => {
    setHasInteracted(false);
    fitToScreen();
  };

  const fitToScreen = useCallback((resetScroll = true) => {
    if (!contentRef.current || !containerRef.current || hasInteractedRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const content = contentRef.current.getBoundingClientRect();
    
    if (content.width === 0 || content.height === 0) {
      return;
    }

    // Since content is scaled, we need its unscaled size
    const currentZoom = stateRef.current.zoom;
    const unscaledWidth = content.width / currentZoom;
    const unscaledHeight = content.height / currentZoom;

    const padding = isDocMode ? 128 : 64;
    const availableWidth = Math.max(container.width - padding, 100);
    const availableHeight = Math.max(container.height - padding, 100);

    const scaleX = availableWidth / unscaledWidth;
    const scaleY = availableHeight / unscaledHeight;
    
    // Calculate new zoom to fit the available space
    let newZoom = fitMode === 'width' ? scaleX : Math.min(scaleX, scaleY);
    
    // Limit extreme zoom-in
    newZoom = Math.min(newZoom, 10); 

    // Avoid tiny updates that cause flickering
    if (Math.abs(newZoom - currentZoom) < 0.01) return;

    setZoom(newZoom);
    
    // Calculate centered position
    const newX = (container.width - unscaledWidth * newZoom) / 2;
    const newY = isDocMode ? 64 : (container.height - unscaledHeight * newZoom) / 2;
    
    setPosition({ x: newX, y: newY });
    updateStateRef({ zoom: newZoom, position: { x: newX, y: newY } });
  }, [fitMode, isDocMode]);

  // Automatically fit to screen when content size changes
  const lastFitSize = useRef({ width: 0, height: 0 });
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFit = useCallback((resetScroll = true) => {
    if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current);
    fitTimeoutRef.current = setTimeout(() => {
      fitToScreen(resetScroll);
      initialFitDone.current = true;
    }, 50);
  }, [fitToScreen]);

  useEffect(() => {
    if (!contentRef.current || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      let shouldFit = false;

      for (const entry of entries) {
        if (entry.target === contentRef.current) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            console.log(`RESIZE_LOG_CONTENT | Content: [${width.toFixed(1)}x${height.toFixed(1)}]`);
            updateStateRef({ contentWidth: width });
            setContentHeight(height);
            setContentWidth(width);
          }

          if (!hasInteractedRef.current || !initialFitDone.current) {
            if (Math.abs(width - lastFitSize.current.width) > 2 || 
                Math.abs(height - lastFitSize.current.height) > 2) {
              lastFitSize.current = { width, height };
              shouldFit = true;
            }
          }
        } else if (entry.target === containerRef.current) {
          const { width, height } = entry.contentRect;
          console.log(`RESIZE_LOG | Container: [${width.toFixed(1)}x${height.toFixed(1)}] | Content: [${contentWidth.toFixed(1)}x${contentHeight.toFixed(1)}]`);
          updateStateRef({ containerWidth: width, containerHeight: height });
          setContainerWidth(width);
          setContainerHeight(height);
          // Also trigger fit if container size changes significantly and we haven't interacted
          if (!hasInteractedRef.current || !initialFitDone.current) {
            shouldFit = true;
          }
        }
      }

      if (shouldFit) {
        debouncedFit(!isStreaming);
      }
    });

    observer.observe(contentRef.current);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current);
    };
  }, [debouncedFit, isStreaming]);

  const zoomIn = () => {
    setHasInteracted(true);
    const { zoom: currentZoom } = stateRef.current;
    handleZoom(Math.min(currentZoom * 1.2, 100), null);
  };
  
  const zoomOut = () => {
    setHasInteracted(true);
    const { zoom: currentZoom } = stateRef.current;
    handleZoom(Math.max(currentZoom / 1.2, 0.001), null);
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <div 
        ref={containerRef}
        className={cn(
          "w-full h-full",
          "overflow-hidden bg-zinc-50",
          isDragging && "select-none"
        )}
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: isDragging ? 'grabbing' : (panMode ? 'grab' : 'auto'),
          willChange: 'transform'
        }}
      >
        <div className="relative w-full h-full pointer-events-none">
          <div 
            className="pointer-events-auto absolute"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: isDocMode ? (contentWidth || 940) : (contentWidth || 'auto'),
              minWidth: isDocMode ? 940 : 'auto', 
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <div ref={contentRef} className={cn(isDocMode ? "w-fit bg-white shadow-2xl rounded-sm" : "w-full flex justify-center")}>
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Now outside the scrolling container but inside the relative wrapper */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/80 backdrop-blur border border-zinc-200 p-1 rounded-xl shadow-lg z-20">
        <button 
          onClick={() => setPanMode(!panMode)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            panMode ? "bg-zinc-800 text-white" : "hover:bg-zinc-100 text-zinc-600"
          )}
          title={panMode ? "Disable Pan Tool" : "Enable Pan Tool"}
        >
          <Move size={16} />
        </button>
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <button 
          onClick={zoomOut}
          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="px-2 text-[10px] font-mono font-bold text-zinc-500 min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button 
          onClick={zoomIn}
          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <button 
          onClick={resetZoom}
          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
          title="Fit to Screen"
        >
          <Maximize size={16} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-[9px] text-zinc-400 font-medium bg-white/50 backdrop-blur px-2 py-1 rounded-md pointer-events-none z-20">
        {panMode ? 'Left Click to Pan' : (
          fitMode === 'width' 
            ? 'Scroll to Move • Ctrl + Scroll to Zoom • Middle Click to Pan' 
            : 'Scroll to Zoom • Middle Click to Pan'
        )}
      </div>
    </div>
  );
};
