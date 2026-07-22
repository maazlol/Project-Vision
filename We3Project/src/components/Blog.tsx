import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import '../styles/blog.css';
import { usePublishedPosts } from '../lib/useCmsPosts';
import CmsFeaturedPost from './cms/CmsFeaturedPost';
import CmsPostsGrid from './cms/CmsPostsGrid';

export default function Blog() {
  const {
    posts,
    featured,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = usePublishedPosts('blog', { includeFeatured: true });

  // Avoid showing the featured post twice in the grid
  const gridPosts = featured
    ? posts.filter((p) => p.id !== featured.id)
    : posts;

  return (
    <div className="blog-page pt-20">
      {/* Hero */}
      <section className="blog-hero d-flex align-items-center">
        <div
          className="blog-hero-bg"
          style={{
            backgroundImage:
              "url('https://camgo.org/wp-content/uploads/sites/2/2018/04/social-blogging-add-personal-touch-engage-readers-1200x675.jpg')",
          }}
        />
        <div className="blog-hero-overlay" />
        <div className="container position-relative text-center">
          <span className="hero-eyebrow">FreeHunger Blog</span>
          <h1 className="blog-hero-title">Our Blog</h1>
          <p className="blog-hero-subtitle">
            Discover inspiring stories, food rescue initiatives, volunteer experiences,
            community awareness articles and practical tips to help build a hunger-free future.
          </p>
          <button
               type="button"
                  className="btn btn-blog-primary"
                    onClick={() => {
                    document
                    .getElementById("latest-articles")
                  ?.scrollIntoView({ behavior: "smooth" });
                      }}
>
                  Read Latest Articles <i className="bi bi-arrow-down" />
           </button> {/* ek scroll button dhoondhne me kitni mehnat lagti hai wallah */} 
        </div>
      </section>

      {error && (
        <div className="container py-6">
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 font-medium text-center">
            {error}
          </div>
        </div>
      )}

      {/* Featured */}
      {!loading && featured && <CmsFeaturedPost post={featured} badgeLabel="Featured" />}

      {/* Latest articles */}
      <section className="latest-articles-section" id="latest-articles">
        <div className="container">
          <div className="section-heading text-center">
            <span className="section-eyebrow">From the Field</span>
            <h2 className="section-title">Latest Articles</h2>
            <p className="section-subtitle">
              Stories of impact, practical guides, and updates from our community.
            </p>
          </div>

          <CmsPostsGrid
            posts={gridPosts}
            loading={loading}
            emptyMessage="No blog posts published yet."
            badgeLabel="Blog"
          />

          {hasMore && !loading && (
            <div className="text-center mt-12">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="btn btn-blog-outline disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="animate-spin inline" size={18} /> Loading…
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

      {/* CTA */}
      <section className="py-16 bg-emerald-600 text-white text-center">
        <div className="container">
          <h2 className="text-3xl font-black mb-3 text-white">Want to make an impact?</h2>
          <p className="text-emerald-50 mb-6 max-w-xl mx-auto">
            Join our volunteers or support a meal drive today.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/volunteer"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3 rounded-full hover:bg-emerald-50 transition-all"
            >
              Become a Volunteer
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 bg-emerald-700/50 text-white font-bold px-6 py-3 rounded-full hover:bg-emerald-700 transition-all"
            >
              Visit Impact Feed
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
