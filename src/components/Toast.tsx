/**
 * Toast - Global notification system with undo capability
 * Supports success, error, info, warning types
 * Optimistic UI rollback via undo callback
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Undo2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  onUndo?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: { duration?: number; onUndo?: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider
    return { showToast: (msg: string) => console.warn('Toast not available:', msg) };
  }
  return ctx;
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-green-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-orange-500" />,
  info: <Info size={16} className="text-blue-500" />,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  warning: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
};

const ToastItem = ({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) => {
  const [progress, setProgress] = useState(100);
  const startTime = useRef(Date.now());
  const frameRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        onRemove(toast.id);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-lg text-sm font-medium relative overflow-hidden min-w-[280px] max-w-[420px]",
        STYLES[toast.type]
      )}
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      
      {toast.onUndo && (
        <button
          onClick={() => { toast.onUndo?.(); onRemove(toast.id); }}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold transition-colors shrink-0"
        >
          <Undo2 size={12} />
          실행취소
        </button>
      )}
      
      <button
        onClick={() => onRemove(toast.id)}
        className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5">
        <div 
          className="h-full bg-current opacity-30 transition-none" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'success',
    options?: { duration?: number; onUndo?: () => void }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      id,
      message,
      type,
      duration: options?.duration || (type === 'error' ? 5000 : 3000),
      onUndo: options?.onUndo,
    };
    setToasts(prev => [...prev.slice(-4), newToast]); // Keep max 5 toasts
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
