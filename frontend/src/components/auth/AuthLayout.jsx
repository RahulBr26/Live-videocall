import { motion } from "framer-motion";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, var(--color-accent-dim), transparent 50%), radial-gradient(circle at 80% 80%, rgba(127,184,143,0.15), transparent 50%)",
          }}
        />
        <div className="relative z-10 font-display text-xl font-semibold tracking-tight">
          LiveChat
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            Every conversation,
            <br />
            live and in sync.
          </h1>
          <p className="mt-4 max-w-sm text-[var(--color-text-dim)]">
            Messages, calls, and files — all in one place, updating the instant
            something happens.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-dim)]"
              style={{ opacity: 1 - i * 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-[var(--color-text-dim)]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
