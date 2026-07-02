"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface PodcastSeries {
  uuid: string;
  title: string;
  firstWeekIndex: number;
  cumulative: number[];
}

interface Props {
  weeks: string[];
  podcasts: PodcastSeries[];
}

interface Bubble {
  uuid: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number; // current rendered radius
  targetR: number;
  img: HTMLImageElement | null;
  imgLoaded: boolean;
}

const CATEGORICAL_DARK = [
  "#3987e5", "#199e70", "#c98500", "#008300",
  "#9085e9", "#e66767", "#d55181", "#d95926",
];

function hashColor(uuid: string): string {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) >>> 0;
  return CATEGORICAL_DARK[h % CATEGORICAL_DARK.length];
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const RADIUS_SCALE = 6.5; // px per sqrt(minute)
const MIN_VISIBLE_R = 10;

export default function PodcastBubbleTimeline({ weeks, podcasts }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Map<string, Bubble>>(new Map());
  const [weekIndex, setWeekIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState<{ title: string; minutes: number; x: number; y: number } | null>(null);
  const weekIndexRef = useRef(0);
  const dims = { width: 720, height: 480 };

  useEffect(() => {
    weekIndexRef.current = weekIndex;
  }, [weekIndex]);

  // Autoplay through weeks
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setWeekIndex((i) => {
        if (i >= weeks.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing, weeks.length]);

  const maxMinutes = useMemo(
    () => Math.max(1, ...podcasts.map((p) => Math.max(...p.cumulative))),
    [podcasts]
  );

  // Init bubble state + preload artwork once
  useEffect(() => {
    const map = new Map<string, Bubble>();
    for (const p of podcasts) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const bubble: Bubble = {
        uuid: p.uuid,
        title: p.title,
        x: dims.width / 2 + (Math.random() - 0.5) * 40,
        y: dims.height / 2 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        r: 0,
        targetR: 0,
        img,
        imgLoaded: false,
      };
      img.onload = () => {
        bubble.imgLoaded = true;
      };
      img.src = `https://static.pocketcasts.com/discover/images/webp/200/${p.uuid}.webp`;
      map.set(p.uuid, bubble);
    }
    bubblesRef.current = map;
  }, [podcasts]);

  // Animation loop: physics + render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx = ctx2d;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = dims.width * dpr;
    canvas.height = dims.height * dpr;
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;
    ctx.scale(dpr, dpr);

    let raf: number;

    function step() {
      const wi = weekIndexRef.current;
      const bubbles = Array.from(bubblesRef.current.values());

      // Update target radii from current week data
      for (const p of podcasts) {
        const b = bubblesRef.current.get(p.uuid);
        if (!b) continue;
        const minutes = wi < p.cumulative.length ? p.cumulative[wi] : 0;
        b.targetR = minutes > 0 ? Math.max(MIN_VISIBLE_R, RADIUS_SCALE * Math.sqrt(minutes)) : 0;
      }

      // Ease radius toward target (grow/pop-in)
      for (const b of bubbles) {
        b.r += (b.targetR - b.r) * 0.12;
        if (b.r < 0.5) b.r = 0;
      }

      // Physics: center gravity + pairwise repulsion (only among visible bubbles)
      const visible = bubbles.filter((b) => b.r > 0.5);
      const cx = dims.width / 2;
      const cy = dims.height / 2;
      for (const b of visible) {
        b.vx += (cx - b.x) * 0.0025;
        b.vy += (cy - b.y) * 0.0025;
      }
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i];
          const c = visible[j];
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const minDist = a.r + c.r + 2;
          if (dist < minDist) {
            const overlap = (minDist - dist) / dist;
            const fx = dx * overlap * 0.5;
            const fy = dy * overlap * 0.5;
            a.vx -= fx;
            a.vy -= fy;
            c.vx += fx;
            c.vy += fy;
          }
        }
      }
      for (const b of visible) {
        b.vx *= 0.82;
        b.vy *= 0.82;
        b.x += b.vx;
        b.y += b.vy;
        b.x = Math.max(b.r, Math.min(dims.width - b.r, b.x));
        b.y = Math.max(b.r, Math.min(dims.height - b.r, b.y));
      }

      // Render
      ctx.clearRect(0, 0, dims.width, dims.height);
      const sorted = [...visible].sort((x, y) => y.r - x.r);
      for (const b of sorted) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (b.imgLoaded) {
          ctx.drawImage(b.img!, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        } else {
          ctx.fillStyle = hashColor(b.uuid);
          ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(15,15,15,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (b.r > 26) {
          ctx.font = `600 ${Math.min(13, b.r / 3.2)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 4;
          const label = b.title.length > 18 ? b.title.slice(0, 16) + "…" : b.title;
          ctx.fillText(label, b.x, b.y + b.r + 12);
          ctx.shadowBlur = 0;
        }
      }

      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [podcasts, maxMinutes]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: Bubble | null = null;
    for (const b of bubblesRef.current.values()) {
      if (b.r < 1) continue;
      const dx = mx - b.x;
      const dy = my - b.y;
      if (Math.sqrt(dx * dx + dy * dy) <= b.r) {
        found = b;
        break;
      }
    }
    if (found) {
      const wi = weekIndexRef.current;
      const p = podcasts.find((p) => p.uuid === found!.uuid);
      const minutes = p && wi < p.cumulative.length ? p.cumulative[wi] : 0;
      setHover({ title: found.title, minutes, x: mx, y: my });
    } else {
      setHover(null);
    }
  }

  const totals = useMemo(() => {
    const wi = weekIndex;
    let totalMinutes = 0;
    let podcastCount = 0;
    for (const p of podcasts) {
      const m = wi < p.cumulative.length ? p.cumulative[wi] : 0;
      totalMinutes += m;
      if (m > 0) podcastCount++;
    }
    return { totalMinutes, podcastCount };
  }, [weekIndex, podcasts]);

  return (
    <div className="bubble-timeline">
      <div className="bubble-timeline-stats">
        <div className="stat">
          <span className="stat-num">{formatWeek(weeks[weekIndex])}</span>
          week of
        </div>
        <div className="stat">
          <span className="stat-num">{totals.podcastCount}</span>
          podcasts discovered
        </div>
        <div className="stat">
          <span className="stat-num">{Math.round(totals.totalMinutes / 60)}h</span>
          listened so far
        </div>
      </div>

      <div className="bubble-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
        {hover && (
          <div
            className="bubble-tooltip"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            <strong>{hover.title}</strong>
            <br />
            {Math.round(hover.minutes)} min total
          </div>
        )}
      </div>

      <div className="bubble-controls">
        <button className="btn-primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={weeks.length - 1}
          value={weekIndex}
          onChange={(e) => {
            setPlaying(false);
            setWeekIndex(Number(e.target.value));
          }}
          className="bubble-scrubber"
        />
      </div>
    </div>
  );
}
