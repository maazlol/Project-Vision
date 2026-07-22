import { Link } from 'react-router-dom';
import {
  type CmsPost,
  formatPostDate,
  getPostPath,
  estimateReadMinutes,
} from '../../lib/cmsPosts';

interface CmsFeaturedPostProps {
  post: CmsPost;
  badgeLabel?: string;
}

export default function CmsFeaturedPost({ post, badgeLabel }: CmsFeaturedPostProps) {
  const path = getPostPath(post);
  const dateLabel = formatPostDate(post.createdAt);
  const minutes = estimateReadMinutes(post.content);
  const badge = badgeLabel || (post.category === 'news' ? 'News' : 'Featured');

  return (
    <section className="featured-article-section">
      <div className="container">
        <div className="featured-article-card">
          <div className="row g-0 align-items-stretch">
            <div className="col-lg-6">
              <div className="featured-article-img-wrap">
                {post.image ? (
                  <img src={post.image} alt={post.title} />
                ) : (
                  <div
                    className="w-full h-full min-h-[380px]"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  />
                )}
                <span className="badge cat-badge">{badge}</span>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="featured-article-content">
                <div className="article-meta-top">
                  {post.author && (
                    <span>
                      <i className="bi bi-person-circle" /> {post.author}
                    </span>
                  )}
                  <span>
                    <i className="bi bi-clock" /> {minutes} min read
                  </span>
                  {dateLabel && (
                    <span>
                      <i className="bi bi-calendar3" /> {dateLabel}
                    </span>
                  )}
                </div>
                <h2 className="featured-article-title">{post.title}</h2>
                <p className="featured-article-excerpt">{post.excerpt}</p>
                <Link to={path} className="btn btn-blog-outline">
                  Read More <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
