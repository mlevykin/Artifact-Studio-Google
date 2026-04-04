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
  markdownText?: string;
  onExit: () => void;
}

export const DiagramPresenter: React.FC<DiagramPresenterProps> = ({ 
  children, 
  totalSteps, 
  title, 
  markdownText,
  onExit 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showText, setShowText] = useState(true);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const zoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.2, 3)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.2, 0.5)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

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
      } else if (e.key === 't' || e.key === 'T') {
        setShowText(prev => !prev);
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
      className="fixed inset-0 z-[200] bg-zinc-50 flex flex-col items-center justify-center overflow-hidden select-none"
      onClick={handleContainerClick}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-white/80 to-transparent z-10 backdrop-blur-sm">
        <div className="flex flex-col">
          <h2 className="text-zinc-900 font-bold text-xl tracking-tight">{title || 'Presentation mode'}</h2>
          <div className="text-zinc-500 text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
            onClick={() => setShowText(!showText)}
            className={cn(
              "p-2.5 rounded-full transition-all shadow-sm",
              showText ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            )}
            title="Toggle Text (T)"
          >
            <Type size={20} />
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
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 relative">
        {/* Diagram Area */}
        <motion.div 
          className="flex-1 flex items-center justify-center w-full h-full"
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-12 border border-zinc-100">
            {children(currentStep)}
          </div>
        </motion.div>

        {/* Markdown Text Panel (Bottom) */}
        <AnimatePresence>
          {showText && markdownText && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-3xl w-full bg-white/90 p-6 rounded-2xl border border-zinc-200 shadow-xl backdrop-blur-md z-20"
            >
              <div className="prose prose-zinc prose-sm max-w-none text-center">
                <p className="text-zinc-500 font-medium uppercase tracking-widest text-[10px] mb-2">Context</p>
                <div className="text-zinc-800 text-base leading-relaxed">
                  {markdownText}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
