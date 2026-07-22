import { Link } from 'react-router-dom';
import {
  type CmsPost,
  formatPostDate,
  getPostPath,
} from '../../lib/cmsPosts';

interface CmsRelatedPostsProps {
  posts: CmsPost[];
  title?: string;
}

export default function CmsRelatedPosts({
  posts,
  title = 'Related Posts',
}: CmsRelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="related-articles-section py-16 bg-slate-50">
      <div className="container">
        <div className="section-heading text-center mb-10">
          <span className="section-eyebrow">Keep Reading</span>
          <h2 className="section-title" style={{ fontSize: '2rem' }}>
            {title}
          </h2>
        </div>
        <div className="row g-4">
          {posts.map((post) => (
            <div key={post.id} className="col-md-6 col-lg-3">
              <Link to={getPostPath(post)} className="blog-card block no-underline h-full">
                <div className="blog-card-img-wrap" style={{ height: 160 }}>
                  {post.image ? (
                    <img src={post.image} alt={post.title} loading="lazy" />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    />
                  )}
                </div>
                <div className="blog-card-body" style={{ padding: '18px' }}>
                  <h5 className="blog-card-title" style={{ fontSize: '1rem' }}>
                    {post.title}
                  </h5>
                  {formatPostDate(post.createdAt) && (
                    <span className="publish-date">
                      <i className="bi bi-calendar3" /> {formatPostDate(post.createdAt)}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
