import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import '../styles/news.css';
import '../styles/blog.css';
import { usePublishedPosts } from '../lib/useCmsPosts';
import {
  type CmsPost,
  formatPostDate,
  getPostPath,
  estimateReadMinutes,
} from '../lib/cmsPosts';
import CmsPostsGrid from './cms/CmsPostsGrid';

const QUICK_STATS = [
  { label: 'Meals Served', value: '150K+', icon: 'bi-heart-fill' },
  { label: 'Volunteers', value: '3,400+', icon: 'bi-people-fill' },
  { label: 'NGOs', value: '20+', icon: 'bi-building' },
  { label: 'Cities', value: '12+', icon: 'bi-geo-alt-fill' },
] as const;

type TopicId = 'all' | 'emergency' | 'community' | 'volunteer' | 'programs';

interface NewsTopic {
  id: TopicId;
  label: string;
  match?: (post: CmsPost) => boolean;
}

const NEWS_TOPICS: NewsTopic[] = [
  { id: 'all', label: 'All News' },
  {
    id: 'emergency',
    label: 'Emergency Relief',
    match: (p) =>
      /emergency|relief|crisis|flood|disaster|urgent|rescue/i.test(
        `${p.title} ${p.excerpt} ${p.content}`
      ),
  },
  {
    id: 'community',
    label: 'Community',
    match: (p) =>
      /community|neighborhood|local|school|family|families/i.test(
        `${p.title} ${p.excerpt} ${p.content}`
      ),
  },
  {
    id: 'volunteer',
    label: 'Volunteers',
    match: (p) =>
      /volunteer|drive|campaign|outreach/i.test(`${p.title} ${p.excerpt} ${p.content}`),
  },
  {
    id: 'programs',
    label: 'Programs',
    match: (p) =>
      /program|meal|food|distribution|initiative|partnership/i.test(
        `${p.title} ${p.excerpt} ${p.content}`
      ),
  },
];

export default function News() {
  const {
    posts,
    featured,
    heroPosts,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = usePublishedPosts('news', { includeFeatured: true, includeHero: true });

  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTopic, setActiveTopic] = useState<TopicId>('all');

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

  const topic = NEWS_TOPICS.find((t) => t.id === activeTopic) ?? NEWS_TOPICS[0];

  const filteredPosts = useMemo(() => {
    if (!topic.match) return posts;
    return posts.filter((p) => topic.match!(p));
  }, [posts, topic]);

  const gridPosts = useMemo(() => {
    if (!featured) return filteredPosts;
    return filteredPosts.filter((p) => p.id !== featured.id);
  }, [filteredPosts, featured]);

  const latestUpdates = useMemo(() => posts.slice(0, 4), [posts]);
  const recentPosts = useMemo(() => posts.slice(0, 4), [posts]);

  const topicCounts = useMemo(() => {
    const counts: Record<TopicId, number> = {
      all: posts.length,
      emergency: 0,
      community: 0,
      volunteer: 0,
      programs: 0,
    };
    for (const t of NEWS_TOPICS) {
      if (!t.match) continue;
      counts[t.id] = posts.filter((p) => t.match!(p)).length;
    }
    return counts;
  }, [posts]);

  const showFeatured =
    featured &&
    (activeTopic === 'all' ||
      (topic.match ? topic.match(featured) : true));

  // Cold load: one full-page skeleton until all Firestore queries finish.
  // Warm revisits use cache (`loading` stays false; `refreshing` is soft).
  if (loading) {
    return (
      <div className="news-page pt-20" aria-busy="true" aria-label="Loading news">
        <div className="news-page-skeleton">
          <div className="news-page-skel-hero">
            <div className="cms-skel-shimmer" />
          </div>
          <div className="container news-page-skel-body">
            <div className="row g-4 g-xl-5">
              <div className="col-12 col-lg-8 news-main-col">
                <div className="mb-4">
                  <div className="cms-skel-line cms-skel-line--meta" style={{ width: 120 }} />
                  <div className="cms-skel-line cms-skel-line--title mt-3" style={{ width: '55%' }} />
                  <div className="cms-skel-line cms-skel-line--body short" style={{ width: '70%' }} />
                </div>
                <article className="featured-news-card cms-card-skeleton mb-4" aria-hidden>
                  <div className="row g-0 align-items-stretch">
                    <div className="col-lg-6">
                      <div className="featured-img-wrap">
                        <div className="cms-skel-shimmer" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="featured-content">
                        <div className="cms-skel-line cms-skel-line--title" />
                        <div className="cms-skel-line cms-skel-line--body" />
                        <div className="cms-skel-line cms-skel-line--body short" />
                        <div className="cms-skel-meta">
                          <div className="cms-skel-line cms-skel-line--meta" />
                          <div className="cms-skel-line cms-skel-line--meta short" />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
                <div className="row g-4" aria-hidden>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="col-md-6">
                      <article className="blog-card cms-card-skeleton">
                        <div className="blog-card-img-wrap cms-skel-media">
                          <div className="cms-skel-shimmer" />
                        </div>
                        <div className="blog-card-body">
                          <div className="cms-skel-line cms-skel-line--title" />
                          <div className="cms-skel-line cms-skel-line--body" />
                          <div className="cms-skel-line cms-skel-line--body short" />
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-12 col-lg-4 news-side-col">
                <div className="news-page-skel-side" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="news-page-skel-side-block">
                      <div className="cms-skel-line cms-skel-line--title" style={{ width: '50%' }} />
                      <div className="cms-skel-line cms-skel-line--body" />
                      <div className="cms-skel-line cms-skel-line--body" />
                      <div className="cms-skel-line cms-skel-line--body short" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page pt-20">
      {/* Hero carousel (React-controlled, no Bootstrap JS dependency) */}
      <section className="hero-carousel-section">
        <div className="carousel slide hero-carousel">
          {heroPosts.length === 0 ? (
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
        <div className="container pt-4">
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 font-medium text-center">
            {error}
          </div>
        </div>
      )}

      {/* Two-column main content — tight spacing under hero */}
      <section className="main-content-section" id="latest-news">
        <div className="container">
          <div className="row g-4 g-xl-5">
            {/* LEFT ~70% */}
            <div className="col-12 col-lg-8 news-main-col">
              <div className="mb-4">
                <span className="section-tag">
                  Latest Updates
                  {refreshing && <span className="news-refresh-dot" title="Updating…" aria-label="Updating" />}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
                  News &amp; Field Reports
                </h2>
                <p className="text-slate-500 mb-0">
                  Stay informed about emergency relief, volunteer drives, and community programs.
                </p>
              </div>

              {/* Featured Story */}
              {showFeatured && featured ? (
                <article className="featured-news-card mb-4">
                  <div className="row g-0 align-items-stretch">
                    <div className="col-lg-6">
                      <div className="featured-img-wrap">
                        {featured.image ? (
                          <img
                            src={featured.image}
                            alt={featured.title}
                            className="featured-img"
                          />
                        ) : (
                          <div
                            className="featured-img"
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            }}
                          />
                        )}
                        <div className="position-badge">
                          <span className="badge news-badge bg-success">Featured</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="featured-content">
                        <h3 className="featured-title">{featured.title}</h3>
                        <p className="featured-desc">{featured.excerpt}</p>
                        <div className="featured-meta mb-3">
                          {formatPostDate(featured.createdAt) && (
                            <span>
                              <i className="bi bi-calendar3" /> {formatPostDate(featured.createdAt)}
                            </span>
                          )}
                          {featured.author && (
                            <span>
                              <i className="bi bi-person" /> {featured.author}
                            </span>
                          )}
                          <span>
                            <i className="bi bi-clock" /> {estimateReadMinutes(featured.content)} min
                            read
                          </span>
                        </div>
                        <Link to={getPostPath(featured)} className="btn btn-outline-news">
                          Read Full Story <i className="bi bi-arrow-right" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ) : null}

              {/* News grid — cold loading is gated above; only empty/real cards here */}
              <CmsPostsGrid
                posts={gridPosts}
                emptyMessage={
                  activeTopic === 'all'
                    ? 'No news articles published yet.'
                    : `No articles in “${topic.label}” yet.`
                }
                badgeLabel="News"
                columnClass="col-md-6"
              />

              {hasMore && (
                <div className="text-center mt-10">
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

            {/* RIGHT ~30% */}
            <div className="col-12 col-lg-4 news-side-col">
              <aside className="sidebar-sticky">
                {/* Latest Updates */}
                <div className="sidebar-widget">
                  <h3 className="widget-title">
                    <i className="bi bi-lightning-charge-fill" /> Latest Updates
                  </h3>
                  {latestUpdates.length === 0 ? (
                    <p className="text-slate-400 text-sm mb-0">No updates yet.</p>
                  ) : (
                    <ul className="latest-updates-list">
                      {latestUpdates.map((post) => (
                        <li key={post.id}>
                          <span className="dot" />
                          <div>
                            <Link to={getPostPath(post)}>{post.title}</Link>
                            {formatPostDate(post.createdAt) && (
                              <small>
                                <i className="bi bi-calendar3" /> {formatPostDate(post.createdAt)}
                              </small>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Popular Categories */}
                <div className="sidebar-widget">
                  <h3 className="widget-title">
                    <i className="bi bi-grid-fill" /> Popular Categories
                  </h3>
                  <ul className="category-list">
                    {NEWS_TOPICS.map((t) => {
                      const count = topicCounts[t.id];
                      const isActive = activeTopic === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            className={`category-filter-btn${isActive ? ' active' : ''}`}
                            onClick={() => setActiveTopic(t.id)}
                            aria-pressed={isActive}
                          >
                            <span className="category-filter-label">{t.label}</span>
                            <span>{count}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Quick Statistics */}
                <div className="sidebar-widget stats-widget">
                  <h3 className="widget-title">
                    <i className="bi bi-bar-chart-fill" /> Quick Statistics
                  </h3>
                  {QUICK_STATS.map((stat) => (
                    <div key={stat.label} className="stat-item">
                      <i className={`bi ${stat.icon}`} />
                      <div>
                        <h4>{stat.value}</h4>
                        <p>{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Posts */}
                <div className="sidebar-widget">
                  <h3 className="widget-title">
                    <i className="bi bi-clock-history" /> Recent Posts
                  </h3>
                  {recentPosts.length === 0 ? (
                    <p className="text-slate-400 text-sm mb-0">No recent posts.</p>
                  ) : (
                    recentPosts.map((post) => (
                      <div key={post.id} className="recent-post-item">
                        {post.image ? (
                          <img src={post.image} alt="" loading="lazy" />
                        ) : (
                          <div
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 12,
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <Link to={getPostPath(post)}>{post.title}</Link>
                          {formatPostDate(post.createdAt) && (
                            <small>
                              <i className="bi bi-calendar3" /> {formatPostDate(post.createdAt)}
                            </small>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
