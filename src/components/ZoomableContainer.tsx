import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { cn } from '../utils';

interface ZoomableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ZoomableContainer: React.FC<ZoomableContainerProps> = ({ children, className }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = Math.pow(1.1, delta / 100);
      // "Infinite" zoom - very wide range
      const newZoom = Math.min(Math.max(zoom * factor, 0.01), 50);
      setZoom(newZoom);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan with:
    // 1. Middle click
    // 2. Left click with Alt/Shift
    // 3. Left click if panMode is active
    if (e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey || panMode))) {
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
  }, [isDragging]);

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 50));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.01));

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden bg-zinc-50 select-none", className)}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : (panMode ? 'grab' : 'auto') }}
    >
      <div 
        ref={contentRef}
        className="w-full h-full transition-transform duration-75 ease-out origin-center flex items-center justify-center pointer-events-none"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        }}
      >
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>

      {/* Controls */}
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
          title="Reset Zoom"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-[9px] text-zinc-400 font-medium bg-white/50 backdrop-blur px-2 py-1 rounded-md pointer-events-none">
        {panMode ? 'Left Click to Pan' : 'Middle Click to Pan • Ctrl + Scroll to Zoom'}
      </div>
    </div>
  );
};
