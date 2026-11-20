"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

/**
 * Operator sign-in for the demo build. The citizen app auto-signs-in as the
 * seeded resident (see auth-context) and needs no login page — this route
 * exists so a responder/admin can reach `/dashboard`, e.g. to watch an SOS
 * sent from the Android app land live. Seeded by `seed_demo_data.py`:
 *   admin — phone 9000000001 / drishtiops
 */
export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login({ phone, password });
      signIn(res.access_token, res.user);
      router.push(res.user.role === "citizen" ? "/" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate2-50 px-4 py-16 text-navy-900">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-sm font-semibold text-navy-900">Aasha Setu</p>
        <div className="card p-6">
          <h1 className="text-xl font-semibold">Operator sign in</h1>
          <p className="mt-1 mb-6 text-sm text-slate2-500">
            Command centre access. The citizen app doesn&apos;t use this page.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate2-700">Phone number</label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate2-700">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full h-11 disabled:opacity-50">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-xs text-slate2-500">
          Demo admin: <span className="font-mono text-slate2-700">9000000001 / drishtiops</span>
        </p>
      </div>
    </div>
  );
}
