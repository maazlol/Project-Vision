import { Link, useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import '../styles/article.css';
import '../styles/blog.css';
import { useCmsPostBySlug } from '../lib/useCmsPosts';
import {
  formatPostDate,
  estimateReadMinutes,
  getPostPath,
} from '../lib/cmsPosts';
import CmsPostBody from './cms/CmsPostBody';
import CmsRelatedPosts from './cms/CmsRelatedPosts';

export default function Article() {
  const { slug } = useParams();
  const location = useLocation();
  const { post, related, loading, error, notFound } = useCmsPostBySlug(slug);

  const backPath = post
    ? post.category === 'news'
      ? '/news'
      : '/blog'
    : location.pathname.startsWith('/news')
      ? '/news'
      : '/blog';

  const backLabel = backPath === '/news' ? 'Back to News' : 'Back to Blog';

  if (loading) {
    return (
      <div className="article-page pt-32 min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="article-page pt-32 container mx-auto px-4 text-center">
        <p className="text-rose-600 font-bold mb-4">{error}</p>
        <Link to={backPath} className="text-emerald-600 font-bold hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="article-page pt-32 container mx-auto px-4 text-center max-w-lg">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-10">
          <h1 className="text-2xl font-black text-slate-900 mb-3">Article not found</h1>
          <p className="text-slate-500 mb-6">
            This post may have been unpublished or the link is incorrect.
          </p>
          <Link
            to={backPath}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all"
          >
            <i className="bi bi-arrow-left" /> {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const dateLabel = formatPostDate(post.createdAt);
  const minutes = estimateReadMinutes(post.content);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : getPostPath(post);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  };

  return (
    <div className="article-page pt-20">
      <div className="article-topbar">
        <div className="container">
          <Link to={backPath} className="back-to-blog">
            <i className="bi bi-arrow-left" /> {backLabel}
          </Link>
        </div>
      </div>

      <section className="article-hero">
        <div
          className="article-hero-bg"
          style={{
            backgroundImage: post.image
              ? `url('${post.image}')`
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}
        />
        <div className="article-hero-overlay" />
        <div className="container article-hero-content">
          <span className="badge cat-badge">
            {post.category === 'news' ? 'News' : 'Blog'}
          </span>
          <h1 className="article-hero-title">{post.title}</h1>
          <div className="article-hero-meta">
            {post.author && (
              <span>
                <i className="bi bi-person-circle" /> {post.author}
              </span>
            )}
            {dateLabel && (
              <span>
                <i className="bi bi-calendar3" /> {dateLabel}
              </span>
            )}
            <span>
              <i className="bi bi-clock" /> {minutes} min read
            </span>
          </div>
        </div>
      </section>

      <div className="share-bar">
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-3">
          <span className="share-label">Share this article</span>
          <div className="share-icons">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Facebook"
            >
              <i className="bi bi-facebook" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Twitter/X"
            >
              <i className="bi bi-twitter-x" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on LinkedIn"
            >
              <i className="bi bi-linkedin" />
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on WhatsApp"
            >
              <i className="bi bi-whatsapp" />
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              aria-label="Copy link"
              className="border-0 bg-transparent p-0"
              style={{ cursor: 'pointer' }}
            >
              <span className="share-icons">
                <a href="#" onClick={(e) => e.preventDefault()} aria-hidden>
                  <i className="bi bi-link-45deg" />
                </a>
              </span>
            </button>
          </div>
        </div>
      </div>

      <section className="article-body-section">
        <div className="container">
          {post.excerpt && (
            <p className="article-content text-lg font-medium text-slate-600 italic mb-8 border-l-4 border-emerald-500 pl-5">
              {post.excerpt}
            </p>
          )}
          <CmsPostBody content={post.content} />
        </div>
      </section>

      <CmsRelatedPosts
        posts={related}
        title={post.category === 'news' ? 'Related News' : 'Related Articles'}
      />
    </div>
  );
}
