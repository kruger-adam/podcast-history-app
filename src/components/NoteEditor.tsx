"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NoteEditorProps {
  episodeUuid: string;
  initialReason?: string | null;
  initialTakeaways?: string | null;
}

export default function NoteEditor({
  episodeUuid,
  initialReason,
  initialTakeaways,
}: NoteEditorProps) {
  const [reason, setReason] = useState(initialReason || "");
  const [takeaways, setTakeaways] = useState(initialTakeaways || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  return (
    <div className="note-editor">
      <label>
        <span className="note-label">Why I listened</span>
        <textarea
          ref={reasonRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={save}
          placeholder="Why did you listen to this?"
          rows={2}
        />
      </label>
      <label>
        <span className="note-label">Takeaways</span>
        <textarea
          ref={takeawaysRef}
          value={takeaways}
          onChange={(e) => setTakeaways(e.target.value)}
          onBlur={save}
          placeholder="What did you take away?"
          rows={2}
        />
      </label>
      {saving && <span className="note-saving">Saving...</span>}
      {saved && <span className="note-saved">Saved</span>}
    </div>
  );
}
