"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReorderButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleReorder() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync/reorder", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(`Done — ${data.updated_count} episodes reordered`);
        router.refresh();
      }
    } catch {
      setResult("Failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sync-section">
      <button onClick={handleReorder} disabled={loading} className="btn-secondary">
        {loading ? "Reordering..." : "Fix Episode Order (one-time)"}
      </button>
      {result && <p className="sync-result">{result}</p>}
    </div>
  );
}
