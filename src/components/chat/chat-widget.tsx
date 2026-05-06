"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { ToolCard } from "./tool-card";
import type { ChatEvent, ChatMessage, ChatToolEvent } from "./types";

const SUGGESTIONS = [
  "I had 2 eggs and a banana for breakfast",
  "Logged a 30-min run, 6 km",
  "Weighed in at 74.2 kg this morning",
  "How many calories do I have left today?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", text: trimmed, tools: [],
    };
    const asstMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "assistant", text: "", tools: [], pending: true,
    };
    setMessages((m) => [...m, userMsg, asstMsg]);
    setInput("");
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Request failed");
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let touchedDb = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ChatEvent;
          try { event = JSON.parse(line) as ChatEvent; } catch { continue; }
          applyEvent(asstMsg.id, event);
          if (event.type === "tool" && (
            event.result.kind === "food" || event.result.kind === "workout" || event.result.kind === "weight"
          )) {
            touchedDb = true;
          }
        }
      }
      // flush a partial tail just in case
      if (buffer.trim()) {
        try { applyEvent(asstMsg.id, JSON.parse(buffer) as ChatEvent); } catch { /* ignore */ }
      }

      setMessages((m) =>
        m.map((x) => x.id === asstMsg.id ? { ...x, pending: false } : x),
      );
      if (touchedDb) router.refresh();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Something went wrong";
      setMessages((m) =>
        m.map((x) => x.id === asstMsg.id ? { ...x, pending: false, error: message } : x),
      );
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function applyEvent(asstId: string, event: ChatEvent) {
    setMessages((m) =>
      m.map((msg) => {
        if (msg.id !== asstId) return msg;
        if (event.type === "text") return { ...msg, text: msg.text + event.delta };
        if (event.type === "tool") return { ...msg, tools: [...msg.tools, event as ChatToolEvent] };
        if (event.type === "error") return { ...msg, error: event.message };
        return msg;
      }),
    );
  }

  function markUndone(asstId: string, toolId: string) {
    setMessages((m) =>
      m.map((msg) => msg.id === asstId
        ? { ...msg, undone: { ...(msg.undone ?? {}), [toolId]: true } }
        : msg),
    );
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-primary text-black shadow-card flex items-center justify-center hover:bg-primary-soft transition active:scale-95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chat assistant"
          className="fixed z-40 bottom-36 right-2 left-2 md:bottom-24 md:right-6 md:left-auto md:w-[400px] max-h-[70vh] flex flex-col bg-surface border border-border rounded-2xl shadow-card overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">Logging assistant</div>
                <div className="text-[11px] text-muted leading-tight">Tell me what you ate or trained</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted hover:text-text p-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Type something natural and I&apos;ll log it. Macros are estimated when I can&apos;t find an exact match.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-surface2 border border-border hover:bg-border transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  onUndone={(toolId) => markUndone(m.id, toolId)}
                />
              ))
            )}
            {busy && messages[messages.length - 1]?.pending && (
              <TypingDots />
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="e.g. 2 eggs and toast for breakfast"
              disabled={busy}
              className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary-ring/40 focus:border-primary max-h-32"
              style={{ minHeight: 44 }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="h-11 w-11 rounded-xl bg-primary text-black flex items-center justify-center disabled:opacity-50 disabled:bg-surface2 disabled:text-muted hover:bg-primary-soft active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Message({
  message, onUndone,
}: { message: ChatMessage; onUndone: (toolId: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-primary text-black rounded-2xl rounded-br-md px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <div className="max-w-[90%] w-full">
        {message.text && (
          <div className="bg-surface2 rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-text whitespace-pre-wrap break-words">
            {message.text}
          </div>
        )}
        {message.tools.map((t) => (
          <ToolCard
            key={t.id}
            event={t}
            undone={message.undone?.[t.id]}
            onUndone={onUndone}
          />
        ))}
        {message.error && (
          <div className="mt-2 text-xs text-danger bg-danger/10 border border-danger/30 rounded-xl px-3 py-2">
            {message.error}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex">
      <div className="bg-surface2 rounded-2xl rounded-bl-md px-3.5 py-3 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
