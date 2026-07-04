import { initials } from "../../utils/helpers";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({ src, name = "", size = "md", isOnline, showStatus = false }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-hover)] font-display font-semibold text-[var(--color-text-dim)] ${SIZES[size]}`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {showStatus && (
        <span className="absolute -bottom-0.5 -right-0.5 block">
          <span className="relative flex h-3 w-3">
            {isOnline && <span className="presence-pulse absolute inline-flex h-full w-full rounded-full" />}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full border-2 border-[var(--color-bg)] ${
                isOnline ? "bg-[var(--color-online)]" : "bg-[var(--color-text-dim)]"
              }`}
            />
          </span>
        </span>
      )}
    </div>
  );
}
