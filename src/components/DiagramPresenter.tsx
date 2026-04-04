import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Type
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
  const [isFullScreen, setIsFullScreen] = useState(true);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep, onExit, reset]);

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
      className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden select-none"
      onClick={handleContainerClick}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex flex-col">
          <h2 className="text-white font-semibold text-lg">{title || 'Diagram Presentation'}</h2>
          <div className="text-zinc-400 text-sm">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowText(!showText)}
            className={cn(
              "p-2.5 rounded-full transition-all",
              showText ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
            title="Toggle Markdown Text (T)"
          >
            <Type size={20} />
          </button>
          <button 
            onClick={onExit}
            className="p-2.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-full transition-all"
            title="Exit Presentation (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex items-center justify-center p-12 relative">
        <div className={cn(
          "flex flex-col items-center justify-center transition-all duration-500 w-full h-full",
          showText && markdownText ? "lg:flex-row gap-12" : "flex-col"
        )}>
          {/* Markdown Text Panel */}
          <AnimatePresence>
            {showText && markdownText && (
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="max-w-md bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-sm"
              >
                <div className="prose prose-invert prose-sm">
                  {markdownText}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Diagram Area */}
          <div className="flex-1 flex items-center justify-center max-w-5xl max-h-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
            {children(currentStep)}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-3 rounded-2xl border border-zinc-800 shadow-2xl z-10">
        <button 
          onClick={reset}
          className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
          title="Reset (R)"
        >
          <RotateCcw size={20} />
        </button>
        
        <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
        
        <button 
          onClick={prevStep}
          disabled={currentStep === 0}
          className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 rounded-xl transition-all"
          title="Previous Step (Left Arrow)"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex items-center gap-1.5 px-4 min-w-[100px] justify-center">
          <span className="text-white font-mono text-lg font-bold">{currentStep}</span>
          <span className="text-zinc-600 font-mono">/</span>
          <span className="text-zinc-500 font-mono">{totalSteps}</span>
        </div>

        <button 
          onClick={nextStep}
          disabled={currentStep === totalSteps}
          className="p-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-20 rounded-xl transition-all shadow-lg"
          title="Next Step (Right Arrow / Space / Click)"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-900">
        <motion.div 
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </motion.div>
  );
};
