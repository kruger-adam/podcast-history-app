"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message || "Sign up failed");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username: usernameClean,
    });

    if (profileError) {
      if (profileError.message.includes("duplicate") || profileError.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError(profileError.message);
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard/credentials");
  }

  return (
    <div className="auth-container">
      <h1>Create account</h1>
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
  );
}
