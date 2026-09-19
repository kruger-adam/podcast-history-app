"use client";

import { useState } from "react";

export default function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" className="note-share-btn" onClick={handleClick}>
      {copied ? "Copied!" : "Share link"}
    </button>
  );
}
