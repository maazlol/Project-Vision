import { Link } from 'react-router-dom';
import {
  type CmsPost,
  formatPostDate,
  getPostPath,
  estimateReadMinutes,
} from '../../lib/cmsPosts';

interface CmsPostCardProps {
  post: CmsPost;
  /** Optional override for badge label */
  badgeLabel?: string;
}

export default function CmsPostCard({ post, badgeLabel }: CmsPostCardProps) {
  const path = getPostPath(post);
  const dateLabel = formatPostDate(post.createdAt);
  const minutes = estimateReadMinutes(post.content);
  const badge =
    badgeLabel || (post.category === 'news' ? 'News' : 'Blog');

  return (
    <article className="blog-card">
      <div className="blog-card-img-wrap">
        {post.image ? (
          <img src={post.image} alt={post.title} loading="lazy" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          />
        )}
        <span className="badge cat-badge">{badge}</span>
      </div>
      <div className="blog-card-body">
        <h5 className="blog-card-title">{post.title}</h5>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <div className="blog-card-meta">
          {post.author && (
            <span>
              <i className="bi bi-person-circle" /> {post.author}
            </span>
          )}
          <span>
            <i className="bi bi-clock" /> {minutes} min read
          </span>
        </div>
        <div className="blog-card-footer">
          {dateLabel && (
            <span className="publish-date">
              <i className="bi bi-calendar3" /> {dateLabel}
            </span>
          )}
          <Link to={path} className="read-more-link">
            Read More <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}
