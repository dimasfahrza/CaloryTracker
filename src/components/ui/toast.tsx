"use client";

import * as React from "react";
import { create } from "zustand";

type Toast = { id: number; message: string; tone: "ok" | "err" };

const useToasts = create<{
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, ...t }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  ok: (message: string) => useToasts.getState().push({ message, tone: "ok" }),
  err: (message: string) => useToasts.getState().push({ message, tone: "err" }),
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-[92vw]">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`text-left px-4 py-3 rounded-xl shadow-card border text-sm
            ${t.tone === "ok"
              ? "bg-surface border-primary/40 text-text"
              : "bg-surface border-danger/50 text-text"}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
