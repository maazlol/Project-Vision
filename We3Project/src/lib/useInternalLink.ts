import { useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';

// Intercepts clicks on anchors injected via dangerouslySetInnerHTML so that
// internal links use the SPA router and in-page anchors scroll, both of which
// would otherwise break under HashRouter.
export function useInternalLink() {
  const navigate = useNavigate();

  return (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    } else if (href.startsWith('#') && href.length > 1) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };
}
