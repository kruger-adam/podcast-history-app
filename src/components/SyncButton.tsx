"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(`Synced — ${data.new_count} new, ${data.updated_count} updated`);
        router.refresh();
      }
    } catch {
      setResult("Sync failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sync-section">
      <button onClick={handleSync} disabled={loading} className="btn-primary">
        {loading ? "Syncing..." : "Sync Now"}
      </button>
      {result && <p className="sync-result">{result}</p>}
    </div>
  );
}
