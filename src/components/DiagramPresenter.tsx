import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Search
} from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface DiagramPresenterProps {
  children: (step: number) => React.ReactNode;
  totalSteps: number;
  title?: string;
  onExit: () => void;
}

export const DiagramPresenter: React.FC<DiagramPresenterProps> = ({ 
  children, 
  totalSteps, 
  title, 
  onExit 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 5));
    }
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep, onExit, reset, zoomIn, zoomOut, resetZoom]);

  // Request Fullscreen on mount
  useEffect(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn(`Error attempting to exit full-screen mode: ${err.message}`);
        });
      }
    };
  }, []);

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
      className="fixed inset-0 z-[200] bg-zinc-50 flex flex-col items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onClick={handleContainerClick}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-white/80 to-transparent z-10 backdrop-blur-sm pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <h2 className="text-zinc-900 font-bold text-xl tracking-tight">{title || 'Presentation mode'}</h2>
          <div className="text-zinc-500 text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
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
          drag
          dragMomentum={false}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ x: position.x, y: position.y }}
          onDragEnd={(_, info) => {
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

      {/* Bottom Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-zinc-200 shadow-2xl z-30">
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
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-200">
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
