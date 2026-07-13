import { useParams } from 'react-router-dom';
import raw1 from '../content/article1.html?raw';
import raw2 from '../content/article2.html?raw';
import raw3 from '../content/article3.html?raw';
import raw4 from '../content/article4.html?raw';
import raw5 from '../content/article5.html?raw';
import raw6 from '../content/article6.html?raw';
import '../styles/article.css';
import { prepareHtml } from '../lib/prepareHtml';
import { useInternalLink } from '../lib/useInternalLink';

const articles: Record<string, string> = {
  article1: raw1,
  article2: raw2,
  article3: raw3,
  article4: raw4,
  article5: raw5,
  article6: raw6,
};

export default function Article() {
  const { slug } = useParams();
  const onClick = useInternalLink();
  const raw = slug ? articles[slug] : undefined;

  if (!raw) {
    return <div className="pt-32 container mx-auto px-4">Article not found.</div>;
  }

  const html = prepareHtml(raw);
  return (
    <div className="article-page pt-20" onClick={onClick}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
