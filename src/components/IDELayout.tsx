import React from 'react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface IDELayoutProps {
  activityBar: ActivityItem[];
  activeActivity: string;
  onActivityChange: (id: string) => void;
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  secondarySidebarContent: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isSecondarySidebarOpen: boolean;
  onToggleSecondarySidebar: () => void;
  sidebarWidth?: number;
  secondarySidebarWidth?: number;
  onSecondarySidebarResizeStart?: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export const IDELayout: React.FC<IDELayoutProps> = ({
  activityBar,
  activeActivity,
  onActivityChange,
  sidebarContent,
  mainContent,
  secondarySidebarContent,
  isSidebarOpen,
  onToggleSidebar,
  isSecondarySidebarOpen,
  onToggleSecondarySidebar,
  sidebarWidth = 300,
  secondarySidebarWidth = 500,
  onSecondarySidebarResizeStart,
  isResizing = false
}) => {
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-300 overflow-hidden font-sans relative">
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-col-resize" />
      )}
      {/* Activity Bar (Far Left) */}
      <div className="w-12 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-50">
        {activityBar.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (activeActivity === item.id && isSidebarOpen) {
                onToggleSidebar();
              } else {
                onActivityChange(item.id);
                if (!isSidebarOpen) onToggleSidebar();
              }
            }}
            className={cn(
              "p-2 rounded-lg transition-all relative group",
              activeActivity === item.id && isSidebarOpen
                ? "text-white bg-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
            title={item.label}
          >
            {item.icon}
            {activeActivity === item.id && isSidebarOpen && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-sky-500 rounded-r-full" 
              />
            )}
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              {item.label}
            </div>
          </button>
        ))}
      </div>

      {/* Side Bar (Left) */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-shrink-0 bg-slate-900/50 border-r border-slate-800 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-hidden">
              {sidebarContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area (Center) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        {mainContent}
      </div>

      {/* Resizer Handle */}
      {isSecondarySidebarOpen && onSecondarySidebarResizeStart && (
        <div 
          onMouseDown={onSecondarySidebarResizeStart}
          className="w-[1px] bg-slate-800 hover:bg-sky-500/50 cursor-col-resize transition-colors z-50 flex-shrink-0 relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* Secondary Side Bar (Right) */}
      <AnimatePresence initial={false}>
        {isSecondarySidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: secondarySidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-shrink-0 bg-slate-900/30 border-l border-slate-800 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-hidden">
              {secondarySidebarContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
