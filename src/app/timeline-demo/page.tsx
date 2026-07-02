import Link from "next/link";
import PodcastBubbleTimeline from "@/components/PodcastBubbleTimeline";
import timelineData from "@/lib/timeline-demo-data.json";

export default function TimelineDemoPage() {
  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <h1>Listening Timeline</h1>
      <p className="subtitle">
        Prototype — bubbles pop in on first listen and grow with cumulative minutes.
        Demo data from adamkruger&apos;s history, bucketed by week.
      </p>
      <PodcastBubbleTimeline weeks={timelineData.weeks} podcasts={timelineData.podcasts} />
      <div className="footer">
        <Link href="/" className="back-link">← Home</Link>
      </div>
    </div>
  );
}
