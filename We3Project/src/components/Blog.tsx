import blogRaw from '../content/blog.html?raw';
import '../styles/blog.css';
import { prepareHtml } from '../lib/prepareHtml';
import { useInternalLink } from '../lib/useInternalLink';

const blogHtml = prepareHtml(blogRaw);

export default function Blog() {
  const onClick = useInternalLink();
  return (
    <div className="blog-page pt-20" onClick={onClick}>
      <div dangerouslySetInnerHTML={{ __html: blogHtml }} />
    </div>
  );
}
