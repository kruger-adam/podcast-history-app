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
          __html: `document.addEventListener('click',function(e){if(e.target.classList.contains('note-toggle')){var n=e.target.closest('.episode-notes');n.classList.toggle('expanded');e.target.textContent=n.classList.contains('expanded')?'less':'more';}});
function expandLinkedNote(){
  var hash = location.hash.slice(1);
  if(!hash) return;
  var el = document.getElementById(hash);
  if(!el) return;
  var details = el.closest('details');
  while(details){ details.open = true; details = details.parentElement && details.parentElement.closest('details'); }
  var notes = el.querySelector('.episode-notes');
  if(notes){
    notes.classList.add('expanded');
    var toggle = notes.querySelector('.note-toggle');
    if(toggle) toggle.textContent = 'less';
  }
  el.scrollIntoView();
}
expandLinkedNote();
window.addEventListener('hashchange', expandLinkedNote);`
        }} />
      </body>
    </html>
  );
}
