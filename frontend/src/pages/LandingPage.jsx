import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] px-6 text-center">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[var(--color-accent)] opacity-[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[var(--color-online)] opacity-[0.06] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 max-w-2xl"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-dim)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-online)] animate-pulse" />
          Real-time. Always in sync.
        </span>

        <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          Chat, call, and<br />
          <span className="text-[var(--color-accent)]">collaborate live.</span>
        </h1>

        <p className="mt-5 text-lg text-[var(--color-text-dim)] max-w-lg mx-auto">
          LiveChat brings your team together with instant messaging, group calls,
          and file sharing — all in one fast, secure app.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
          >
            Get started free
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
          >
            Log in
          </Link>
        </div>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="relative z-10 mt-16 flex flex-wrap justify-center gap-2"
      >
        {["Real-time messaging", "Group video calls", "File sharing", "Typing indicators",
          "Read receipts", "Emoji reactions", "Screen sharing", "Online presence"].map((feat) => (
          <span
            key={feat}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-dim)]"
          >
            {feat}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
