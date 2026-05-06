import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref,
) {
  const inputId = id ?? React.useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          "input",
          error && "border-danger focus:border-danger focus:ring-danger/30",
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string | null }
>(function Select({ className, label, error, id, children, ...props }, ref) {
  const selectId = id ?? React.useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select
        id={selectId}
        ref={ref}
        className={cn("input appearance-none pr-10", error && "border-danger", className)}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string | null }
>(function Textarea({ className, label, error, id, ...props }, ref) {
  const tid = id ?? React.useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={tid} className="label">{label}</label>}
      <textarea
        id={tid}
        ref={ref}
        className={cn("input min-h-[96px] resize-y", error && "border-danger", className)}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
});
