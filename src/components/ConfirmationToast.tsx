import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  onClose: () => void;
}

export default function ConfirmationToast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-dismiss after 4 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgStyles =
    type === 'success'
      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-500/20'
      : type === 'error'
      ? 'bg-red-950/90 border-red-500 text-red-200 shadow-red-500/20'
      : 'bg-zinc-900/90 border-cyan-500 text-cyan-200 shadow-cyan-500/20';

  return (
    <aside aria-label="System notification" className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl ${bgStyles}`}
      >
        {type === 'success' ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 text-cyan-400 shrink-0" />
        )}
        <div className="text-sm font-bold tracking-wide">{message}</div>
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="ml-4 p-1 hover:bg-black/20 rounded-lg transition-all"
        >
          <X className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </aside>
  );
}