"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/cms/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed");
      router.replace("/content");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signin-screen">
      <div className="signin-brand"><span className="brand-mark">a</span><span>atomity<span className="brand-light">cms</span></span></div>
      <section className="signin-card">
        <div className="signin-icon">↗</div>
        <span className="eyebrow">YOUR CONTENT WORKSPACE</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage your published content.</p>
        <form onSubmit={submit} className="form-stack">
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div role="alert" className="alert error-alert">{error}</div>}
          <button className="button primary wide" disabled={loading}>{loading ? "Signing in…" : "Sign in"} <span>→</span></button>
        </form>
        <div className="signin-foot"><span className="connection-dot" /> Single-admin workspace</div>
      </section>
      <div className="signin-background-mark" aria-hidden="true">a</div>
      <footer className="signin-footer">CONTENT THAT MOVES WITH YOUR PRODUCT <span>•</span> ATOMITY CMS</footer>
    </main>
  );
}
