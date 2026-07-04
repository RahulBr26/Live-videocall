import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { authService } from "../../services/authService";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!token) { setState("error"); return; }
    authService.verifyEmail(token)
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="glass rounded-2xl p-10 text-center max-w-sm w-full">
        {state === "loading" && (
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent mx-auto block" />
        )}
        {state === "success" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-xl font-semibold">Email verified</h2>
            <p className="mt-2 text-sm text-[var(--color-text-dim)]">Your account is ready.</p>
            <Link to="/login" className="mt-6 inline-block text-sm text-[var(--color-accent)] hover:underline">
              Log in now →
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-display text-xl font-semibold">Verification failed</h2>
            <p className="mt-2 text-sm text-[var(--color-text-dim)]">Link may be expired or invalid.</p>
            <Link to="/register" className="mt-6 inline-block text-sm text-[var(--color-accent)] hover:underline">
              Register again →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
