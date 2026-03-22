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
  const [isDragging, setIsDragging] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<{ x: number, y: number } | null>(null);

  const isDocMode = fitMode === 'width';

  // Use refs to avoid re-attaching wheel listener too often
  const stateRef = useRef({ zoom, position });
  useEffect(() => {
    stateRef.current = { zoom, position };
  }, [zoom, position]);

  // Track interaction and content versions
  const [hasInteracted, setHasInteracted] = useState(false);
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
    if (pendingScroll.current && containerRef.current) {
      containerRef.current.scrollLeft = pendingScroll.current.x;
      containerRef.current.scrollTop = pendingScroll.current.y;
      pendingScroll.current = null;
    }
  });

  const handleWheel = useCallback((e: WheelEvent) => {
    setHasInteracted(true);
    // If fitMode is 'width', we want to allow normal scrolling unless Ctrl is pressed
    const isZoomAction = e.ctrlKey || e.metaKey || (!isDocMode && fitMode === 'both');
    
    if (isZoomAction) {
      e.preventDefault();
      
      // Standardize delta
      const delta = -e.deltaY;
      const factor = Math.pow(1.1, delta / 100);
      const { zoom: currentZoom, position: currentPos } = stateRef.current;
      
      // Expanded zoom range
      const newZoom = Math.min(Math.max(currentZoom * factor, 0.001), 100);
      
      if (newZoom !== currentZoom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();

        if (isDocMode) {
          // Document mode zoom: adjust scroll to keep focal point
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const scrollX = containerRef.current.scrollLeft;
          const scrollY = containerRef.current.scrollTop;
          
          // Current left offset logic
          const getLeft = (z: number) => Math.max(64, (containerWidth - contentWidth * z) / 2);
          const currentLeft = getLeft(currentZoom);
          const nextLeft = getLeft(newZoom);

          const relX = (scrollX + mouseX - currentLeft) / currentZoom;
          const relY = (scrollY + mouseY - 64) / currentZoom;
          
          setZoom(newZoom);
          
          pendingScroll.current = {
            x: relX * newZoom - mouseX + nextLeft,
            y: relY * newZoom - mouseY + 64
          };
        } else {
          // Diagram mode zoom: adjust position
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const relX = (mouseX - centerX - currentPos.x) / currentZoom;
          const relY = (mouseY - centerY - currentPos.y) / currentZoom;

          const newX = mouseX - centerX - relX * newZoom;
          const newY = mouseY - centerY - relY * newZoom;

          setZoom(newZoom);
          setPosition({ x: newX, y: newY });
        }
      }
    } else {
      // Normal scrolling: browser handles it in DocMode via overflow-y: auto
      // For diagrams, we still simulate it if fitMode is width (though usually it's both)
      if (!isDocMode && fitMode === 'width') {
        setPosition(prev => ({
          ...prev,
          y: prev.y - e.deltaY
        }));
      }
    }
  }, [fitMode, isDocMode]);

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
        if (isDocMode && containerRef.current) {
          // Document mode: pan by scrolling
          containerRef.current.scrollTop -= e.movementY;
          containerRef.current.scrollLeft -= e.movementX;
        } else {
          // Diagram mode: pan by translating
          setPosition(prev => ({
            x: prev.x + e.movementX,
            y: prev.y + e.movementY
          }));
        }
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

  const fitToScreen = () => {
    if (!contentRef.current || !containerRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const content = contentRef.current.getBoundingClientRect();
    
    if (content.width === 0 || content.height === 0) {
      return;
    }

    // Since content is scaled, we need its unscaled size
    const unscaledWidth = content.width / zoom;
    const unscaledHeight = content.height / zoom;

    const padding = 64;
    const availableWidth = Math.max(container.width - padding, 100);
    const availableHeight = Math.max(container.height - padding, 100);

    const scaleX = availableWidth / unscaledWidth;
    const scaleY = availableHeight / unscaledHeight;
    
    // Calculate new zoom to fit the available space
    let newZoom = fitMode === 'width' ? scaleX : Math.min(scaleX, scaleY);
    
    // Limit extreme zoom-in
    newZoom = Math.min(newZoom, 10); 

    setZoom(newZoom);
    
    if (isDocMode) {
      // Reset scroll for documents
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        containerRef.current.scrollLeft = 0;
      }
      setPosition({ x: 0, y: 0 });
    } else {
      // Calculate offsets to center/align for diagrams
      const xOffset = (container.width - unscaledWidth * newZoom) / 2;
      const yOffset = (container.height - unscaledHeight * newZoom) / 2;
      setPosition({ x: xOffset, y: yOffset });
    }
  };

  // Automatically fit to screen when content size changes
  const lastFitSize = useRef({ width: 0, height: 0 });
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFit = useCallback(() => {
    if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current);
    fitTimeoutRef.current = setTimeout(() => {
      fitToScreen();
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
          setContentHeight(height);
          setContentWidth(width);

          if (isStreaming || !initialFitDone.current) {
            if (Math.abs(width - lastFitSize.current.width) > 2 || 
                Math.abs(height - lastFitSize.current.height) > 2) {
              lastFitSize.current = { width, height };
              shouldFit = true;
            }
          }
        } else if (entry.target === containerRef.current) {
          setContainerWidth(entry.contentRect.width);
        }
      }

      if (shouldFit) {
        debouncedFit();
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
    setZoom(prev => Math.min(prev * 1.2, 50));
  };
  
  const zoomOut = () => {
    setHasInteracted(true);
    setZoom(prev => Math.max(prev / 1.2, 0.01));
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <div 
        ref={containerRef}
        className={cn(
          "w-full h-full transition-colors duration-200",
          isDocMode ? "overflow-auto" : "overflow-hidden bg-zinc-50",
          isDragging && "select-none"
        )}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : (panMode ? 'grab' : 'auto') }}
      >
        <div 
          className={cn(
            "relative",
            !isDocMode && "w-full h-full flex items-center justify-center pointer-events-none"
          )}
          style={{ 
            height: isDocMode ? (contentHeight * zoom + 128) : '100%',
            width: isDocMode ? Math.max(containerWidth, contentWidth * zoom + 128) : '100%',
            transform: isDocMode ? 'none' : `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        >
          <div 
            className={cn(
              isDocMode ? "relative pointer-events-auto" : "pointer-events-auto"
            )}
            style={{ 
              transform: isDocMode ? `scale(${zoom})` : 'none',
              transformOrigin: 'top left',
              width: isDocMode ? contentWidth : 'auto',
              position: isDocMode ? 'absolute' : 'relative',
              top: isDocMode ? 64 : 0,
              left: isDocMode ? Math.max(64, (containerWidth - contentWidth * zoom) / 2) : 0
            }}
          >
            <div ref={contentRef} className={cn(isDocMode && "w-full flex justify-center")}>
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
