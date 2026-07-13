import { useEffect, useRef } from 'react';
import aboutRaw from '../content/about.html?raw';
import '../styles/about.css';
import { prepareHtml } from '../lib/prepareHtml';
import { useInternalLink } from '../lib/useInternalLink';

const aboutHtml = prepareHtml(aboutRaw);

export default function About() {
  const onClick = useInternalLink();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const AOS = (window as unknown as { AOS?: { init: (opts?: object) => void; refreshHard: () => void } }).AOS;
    if (AOS) {
      AOS.init({ once: true, mirror: false });
      AOS.refreshHard();
    }
  }, []);

  return (
    <div className="about-page pt-20" ref={ref} onClick={onClick}>
      <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />
    </div>
  );
}
