"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NoteEditorProps {
  episodeUuid: string;
  initialReason?: string | null;
  initialTakeaways?: string | null;
}

const POLISH_ENABLED = false;

export default function NoteEditor({
  episodeUuid,
  initialReason,
  initialTakeaways,
}: NoteEditorProps) {
  const [reason, setReason] = useState(initialReason || "");
  const [takeaways, setTakeaways] = useState(initialTakeaways || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [polishingReason, setPolishingReason] = useState(false);
  const [polishingTakeaways, setPolishingTakeaways] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const takeawaysRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => {
    autoResize(reasonRef.current);
  }, [reason, autoResize]);

  useEffect(() => {
    autoResize(takeawaysRef.current);
  }, [takeaways, autoResize]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_uuid: episodeUuid, reason, takeaways }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function polish(field: "reason" | "takeaways") {
    const text = field === "reason" ? reason : takeaways;
    const setPolishing =
      field === "reason" ? setPolishingReason : setPolishingTakeaways;
    const setText = field === "reason" ? setReason : setTakeaways;

    setPolishing(true);
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, field }),
      });
      if (res.ok) {
        const { polished } = await res.json();
        setText(polished);
      }
    } finally {
      setPolishing(false);
    }
  }

  return (
    <div className="note-editor">
      <div className="note-field">
        <span className="note-label">Why I listened</span>
        <textarea
          ref={reasonRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={save}
          placeholder="Why did you listen to this?"
          rows={2}
        />
        {POLISH_ENABLED && reason.trim() && (
          <button
            className="note-polish-btn"
            onClick={() => polish("reason")}
            disabled={polishingReason}
            type="button"
          >
            {polishingReason ? "Polishing..." : "Polish"}
          </button>
        )}
      </div>
      <div className="note-field">
        <span className="note-label">Takeaways</span>
        <textarea
          ref={takeawaysRef}
          value={takeaways}
          onChange={(e) => setTakeaways(e.target.value)}
          onBlur={save}
          placeholder="What did you take away?"
          rows={2}
        />
        {POLISH_ENABLED && takeaways.trim() && (
          <button
            className="note-polish-btn"
            onClick={() => polish("takeaways")}
            disabled={polishingTakeaways}
            type="button"
          >
            {polishingTakeaways ? "Polishing..." : "Polish"}
          </button>
        )}
      </div>
      {saving && <span className="note-saving">Saving...</span>}
      {saved && <span className="note-saved">Saved</span>}
    </div>
  );
}
