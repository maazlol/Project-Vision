import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import '../styles/news.css';
import '../styles/blog.css';
import { usePublishedPosts } from '../lib/useCmsPosts';
import {
  formatPostDate,
  getPostPath,
} from '../lib/cmsPosts';
import CmsPostsGrid from './cms/CmsPostsGrid';

export default function News() {
  const {
    posts,
    heroPosts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = usePublishedPosts('news', { includeFeatured: false, includeHero: true });

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (heroPosts.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroPosts.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [heroPosts.length]);

  const goPrev = () => {
    if (heroPosts.length === 0) return;
    setActiveSlide((prev) => (prev - 1 + heroPosts.length) % heroPosts.length);
  };

  const goNext = () => {
    if (heroPosts.length === 0) return;
    setActiveSlide((prev) => (prev + 1) % heroPosts.length);
  };

  return (
    <div className="news-page pt-20">
      {/* Hero carousel (React-controlled, no Bootstrap JS dependency) */}
      <section className="hero-carousel-section">
        <div className="carousel slide hero-carousel">
          {loading && heroPosts.length === 0 ? (
            <div
              className="carousel-item active"
              style={{ height: '70vh', minHeight: 420, background: '#0f172a' }}
            >
              <div className="hero-overlay" />
              <div className="container h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={40} />
              </div>
            </div>
          ) : heroPosts.length === 0 ? (
            <div
              className="carousel-item active"
              style={{ height: '60vh', minHeight: 400, background: '#0f172a' }}
            >
              <div
                className="hero-slide-img"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80')",
                }}
              />
              <div className="hero-overlay" />
              <div className="container">
                <div className="carousel-caption-custom">
                  <span className="badge news-badge bg-success">News</span>
                  <h1 className="hero-title">FreeHunger News &amp; Updates</h1>
                  <p className="hero-desc">
                    Latest field reports, emergency responses, and community milestones will appear here.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {heroPosts.length > 1 && (
                <div className="carousel-indicators">
                  {heroPosts.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className={i === activeSlide ? 'active' : ''}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setActiveSlide(i)}
                    />
                  ))}
                </div>
              )}

              <div className="carousel-inner">
                {heroPosts.map((post, i) => (
                  <div
                    key={post.id}
                    className={`carousel-item ${i === activeSlide ? 'active' : ''}`}
                    style={{ display: i === activeSlide ? 'block' : 'none' }}
                  >
                    <div
                      className="hero-slide-img"
                      style={{
                        backgroundImage: post.image
                          ? `url('${post.image}')`
                          : "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80')",
                      }}
                    />
                    <div className="hero-overlay" />
                    <div className="container">
                      <div className="carousel-caption-custom">
                        <span className="badge news-badge bg-success">News</span>
                        <h1 className="hero-title">{post.title}</h1>
                        <p className="hero-desc">{post.excerpt}</p>
                        <div className="hero-meta">
                          {formatPostDate(post.createdAt) && (
                            <span>
                              <i className="bi bi-calendar3" /> {formatPostDate(post.createdAt)}
                            </span>
                          )}
                          {post.author && (
                            <span>
                              <i className="bi bi-person" /> {post.author}
                            </span>
                          )}
                        </div>
                        <Link to={getPostPath(post)} className="btn btn-hero mt-3">
                          Read More <i className="bi bi-arrow-right" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {heroPosts.length > 1 && (
                <>
                  <button
                    className="carousel-control-prev"
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous slide"
                  >
                    <span className="carousel-control-icon">
                      <i className="bi bi-chevron-left" />
                    </span>
                  </button>
                  <button
                    className="carousel-control-next"
                    type="button"
                    onClick={goNext}
                    aria-label="Next slide"
                  >
                    <span className="carousel-control-icon">
                      <i className="bi bi-chevron-right" />
                    </span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {error && (
        <div className="container py-6">
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 font-medium text-center">
            {error}
          </div>
        </div>
      )}

      {/* Latest news grid */}
      <section className="latest-articles-section py-20" id="latest-news">
        <div className="container">
          <div className="text-center mb-12">
            <span className="section-tag">Latest Updates</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              News &amp; Field Reports
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Stay informed about emergency relief, volunteer drives, and community programs.
            </p>
          </div>

          <CmsPostsGrid
            posts={posts}
            loading={loading}
            emptyMessage="No news articles published yet."
            badgeLabel="News"
          />

          {hasMore && !loading && (
            <div className="text-center mt-12">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 border-2 border-emerald-500 text-emerald-700 font-bold px-8 py-3 rounded-full hover:bg-emerald-50 transition-all disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Loading…
                  </>
                ) : (
                  <>
                    Load More <i className="bi bi-arrow-down" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
