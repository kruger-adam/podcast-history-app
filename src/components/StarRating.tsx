"use client";

import { useState } from "react";

interface StarRatingProps {
  episodeUuid: string;
  initialRating?: number | null;
}

export default function StarRating({ episodeUuid, initialRating }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save(value: number) {
    const next = value === rating ? 0 : value;
    setSaving(true);
    try {
      await fetch("/api/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_uuid: episodeUuid, rating: next }),
      });
      setRating(next);
    } finally {
      setSaving(false);
    }
  }

  const display = hovered || rating;

  return (
    <div className="star-rating" aria-label={rating ? `Rated ${rating} of 5` : "Not rated"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={`star ${n <= display ? "star-on" : "star-off"}`}
          onClick={() => save(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          disabled={saving}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
