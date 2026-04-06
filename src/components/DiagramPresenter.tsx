import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Type,
  Plus,
  Minus,
  Search,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface DiagramPresenterProps {
  children: (step: number) => React.ReactNode;
  totalSteps: number;
  title?: string;
  onExit: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export const DiagramPresenter: React.FC<DiagramPresenterProps> = ({ 
  children, 
  totalSteps, 
  title, 
  onExit 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const lastPanPos = useRef({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const cursorStyle = useMemo(() => {
    if (isPanning) return 'grabbing';
    if (!isDrawingMode) return undefined;
    const svg = `<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" fill="${penColor.replace('#', '%23')}"/></svg>`;
    return `url('data:image/svg+xml;utf8,${svg}') 5 5, auto`;
  }, [isDrawingMode, penColor, isPanning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = containerRef.current;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          contextRef.current = ctx;
        }
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const drawStroke = (strokePoints: Point[], color: string, width: number) => {
      if (strokePoints.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width * zoom;
      
      const first = strokePoints[0];
      ctx.moveTo(cx + position.x + first.x * zoom, cy + position.y + first.y * zoom);
      
      for (let i = 1; i < strokePoints.length; i++) {
        const p = strokePoints[i];
        ctx.lineTo(cx + position.x + p.x * zoom, cy + position.y + p.y * zoom);
      }
      ctx.stroke();
    };

    strokes.forEach(s => drawStroke(s.points, s.color, s.width));
    if (currentStroke) {
      drawStroke(currentStroke, penColor, 3);
    }
  }, [strokes, currentStroke, zoom, position, penColor]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Handle middle click panning
    if ('button' in e && e.button === 1) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (!isDrawingMode) return;
    // Only allow left click for drawing
    if ('button' in e && e.button !== 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let sx, sy;
    if ('touches' in e) {
      sx = e.touches[0].clientX - rect.left;
      sy = e.touches[0].clientY - rect.top;
    } else {
      sx = e.clientX - rect.left;
      sy = e.clientY - rect.top;
    }

    const lx = (sx - cx - position.x) / zoom;
    const ly = (sy - cy - position.y) / zoom;

    setCurrentStroke([{ x: lx, y: ly }]);
    setIsDrawing(true);
    e.stopPropagation();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning && 'clientX' in e) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing || !isDrawingMode || !currentStroke) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let sx, sy;
    if ('touches' in e) {
      sx = e.touches[0].clientX - rect.left;
      sy = e.touches[0].clientY - rect.top;
    } else {
      sx = e.clientX - rect.left;
      sy = e.clientY - rect.top;
    }

    const lx = (sx - cx - position.x) / zoom;
    const ly = (sy - cy - position.y) / zoom;

    setCurrentStroke(prev => prev ? [...prev, { x: lx, y: ly }] : null);
    e.stopPropagation();
  };

  const stopDrawing = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (isDrawing && currentStroke) {
      setStrokes(prev => [...prev, { points: currentStroke, color: penColor, width: 3 }]);
      setCurrentStroke(null);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.2, 5)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.2, 0.2)), []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 5));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'Escape') {
        onExit();
      } else if (e.key === 'r' || e.key === 'R') {
        reset();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      } else if (e.key === 'p' || e.key === 'P') {
        setIsDrawingMode(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep, onExit, reset, zoomIn, zoomOut, resetZoom, toggleFullscreen]);

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only advance if clicking the background, not buttons
    if (e.target === e.currentTarget) {
      nextStep();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-[200] bg-zinc-50 flex flex-col items-center justify-center overflow-hidden select-none",
        !isDrawingMode && !isPanning && "cursor-grab active:cursor-grabbing"
      )}
      style={{ cursor: cursorStyle }}
      onClick={handleContainerClick}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div 
        className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-white/80 to-transparent z-40 backdrop-blur-sm pointer-events-none"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col pointer-events-auto">
          <h2 className="text-zinc-900 font-bold text-xl tracking-tight">{title || 'Presentation mode'}</h2>
          <div className="text-zinc-500 text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Drawing Tools */}
          <div className="flex items-center bg-zinc-200/50 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2",
                isDrawingMode ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-900 hover:bg-white"
              )}
              title="Toggle Pen (P)"
            >
              <Pencil size={18} />
              {isDrawingMode && <span className="text-[10px] font-bold pr-1">ON</span>}
            </button>
            
            {isDrawingMode && (
              <>
                <div className="w-[1px] h-4 bg-zinc-300 mx-1" />
                <div className="flex items-center gap-1 px-1">
                  {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(color => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                        penColor === color ? "border-zinc-900 scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="w-[1px] h-4 bg-zinc-300 mx-1" />
                <button 
                  onClick={clearCanvas}
                  className="p-2 text-zinc-600 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                  title="Clear Drawing"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center bg-zinc-200/50 p-1 rounded-xl mr-4">
            <button 
              onClick={zoomOut}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
              title="Zoom Out (-)"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={resetZoom}
              className="px-3 text-xs font-bold text-zinc-600 hover:text-zinc-900"
              title="Reset Zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button 
              onClick={zoomIn}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
              title="Zoom In (+)"
            >
              <Plus size={18} />
            </button>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="p-2.5 bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-full transition-all shadow-sm"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button 
            onClick={onExit}
            className="p-2.5 bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-full transition-all shadow-sm"
            title="Exit (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div 
          drag={!isDrawingMode}
          dragMomentum={false}
          className={cn(
            "flex items-center justify-center",
            !isDrawingMode && "cursor-grab active:cursor-grabbing"
          )}
          style={{ x: position.x, y: position.y }}
          onDragEnd={(_, info) => {
            if (isDrawingMode) return;
            setPosition(prev => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y
            }));
          }}
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-12 border border-zinc-100 pointer-events-auto">
            {children(currentStep)}
          </div>
        </motion.div>
      </div>

      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 z-20 pointer-events-none"
        )}
      />

      {/* Bottom Controls */}
      <div 
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-zinc-200 shadow-2xl z-40"
        onMouseDown={e => e.stopPropagation()}
      >
        <button 
          onClick={reset}
          className="p-3 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
          title="Reset (R)"
        >
          <RotateCcw size={20} />
        </button>
        
        <div className="h-6 w-[1px] bg-zinc-200 mx-2" />
        
        <button 
          onClick={prevStep}
          disabled={currentStep === 0}
          className="p-3 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-20 rounded-xl transition-all"
          title="Previous (Left Arrow)"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex items-center gap-1.5 px-4 min-w-[100px] justify-center">
          <span className="text-zinc-900 font-mono text-xl font-bold">{currentStep}</span>
          <span className="text-zinc-300 font-mono">/</span>
          <span className="text-zinc-500 font-mono font-medium">{totalSteps}</span>
        </div>

        <button 
          onClick={nextStep}
          disabled={currentStep === totalSteps}
          className="p-3 bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-20 rounded-xl transition-all shadow-lg"
          title="Next (Right Arrow / Space / Click)"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress Indicator */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-200 z-40"
        onMouseDown={e => e.stopPropagation()}
      >
        <motion.div 
          className="h-full bg-zinc-900 shadow-[0_0_10px_rgba(0,0,0,0.1)]"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </motion.div>
  );
};
