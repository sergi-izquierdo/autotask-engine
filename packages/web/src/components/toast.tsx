"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "warning";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all",
              "animate-in slide-in-from-bottom-5 fade-in duration-300",
              "min-w-[320px] max-w-[420px]",
              variantClasses[toast.variant],
            )}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
