"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CredentialsForm({ hasExisting }: { hasExisting: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save credentials");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {hasExisting && (
        <p className="field-hint">Your credentials are already connected. Update them below if needed.</p>
      )}
      <label>
        Pocket Casts email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        Pocket Casts password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Verifying..." : hasExisting ? "Update credentials" : "Connect Pocket Casts"}
      </button>
    </form>
  );
}
