import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Podcast History",
  description: "Share your podcast listening history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `document.addEventListener('click',function(e){if(e.target.classList.contains('note-toggle')){var n=e.target.closest('.episode-notes');n.classList.toggle('expanded');e.target.textContent=n.classList.contains('expanded')?'less':'more';}});`
        }} />
      </body>
    </html>
  );
}
