import { useEffect, useRef } from 'react';
import newsRaw from '../content/news.html?raw';
import '../styles/news.css';
import { prepareHtml } from '../lib/prepareHtml';
import { useInternalLink } from '../lib/useInternalLink';

const newsHtml = prepareHtml(newsRaw);

export default function News() {
  const onClick = useInternalLink();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector('#heroCarousel');
    const bootstrap = (window as unknown as { bootstrap?: { Carousel: new (el: Element, opts?: object) => unknown } }).bootstrap;
    if (el && bootstrap) {
      new bootstrap.Carousel(el, { interval: 6000 });
    }
  }, []);

  return (
    <div className="news-page pt-20" ref={ref} onClick={onClick}>
      <div dangerouslySetInnerHTML={{ __html: newsHtml }} />
    </div>
  );
}
