import { create } from "zustand";

export type ToastType = "success" | "error" | "info";
export type Toast = { id: number; message: string; type: ToastType };

type ToastState = {
  toasts: Toast[];
  push: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire a toast from anywhere (components or event handlers). */
export const toast = {
  success: (m: string) => useToasts.getState().push(m, "success"),
  error: (m: string) => useToasts.getState().push(m, "error"),
  info: (m: string) => useToasts.getState().push(m, "info"),
};
