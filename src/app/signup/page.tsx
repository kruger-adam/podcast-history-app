"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const usernameClean = username.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/.test(usernameClean)) {
      setError("Username must be 3–30 characters: lowercase letters, numbers, hyphens, underscores.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check username availability before creating the account
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", usernameClean)
      .maybeSingle();

    if (existing) {
      setError("That username is already taken.");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: usernameClean },
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-container">
        <h1>Check your email</h1>
        <p className="subtitle">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and sign in.
        </p>
        <p className="auth-footer">
          Wrong email? <Link href="/signup">Start over</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="signup-layout">
      <div className="signup-explainer">
        <h1>Share your podcast listening history</h1>
        <p className="subtitle">Connect Pocket Casts and get a public page that shows what you&apos;ve been listening to.</p>

        <ol className="signup-steps">
          <li>Create your free account</li>
          <li>Enter your Pocket Casts credentials</li>
          <li>Sync your listening history</li>
          <li>Share your page at <span className="accent-text">/u/yourname</span></li>
        </ol>

        <div className="signup-features">
          <div className="signup-feature">Auto-syncs your history daily</div>
          <div className="signup-feature">Manual sync whenever you want</div>
          <div className="signup-feature">Add notes to episodes — why you listened, key takeaways</div>
          <div className="signup-feature">Free</div>
        </div>
      </div>

      <div className="auth-container signup-form-col">
        <h2>Create account</h2>
        <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. adam"
            required
            autoFocus
          />
          <span className="field-hint">Your public profile will be at /u/{username || "you"}</span>
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
