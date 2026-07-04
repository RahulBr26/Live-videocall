import { forwardRef } from "react";

const Input = forwardRef(({ label, error, className = "", ...props }, ref) => {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-dim)]">{label}</span>
      )}
      <input
        ref={ref}
        className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] transition-colors focus:outline-none ${
          error
            ? "border-red-500/60 focus:border-red-500"
            : "border-[var(--color-border)] focus:border-[var(--color-accent)]"
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
});

Input.displayName = "Input";
export default Input;
