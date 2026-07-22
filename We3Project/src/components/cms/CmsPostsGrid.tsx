import type { CmsPost } from '../../lib/cmsPosts';
import CmsPostCard from './CmsPostCard';

interface CmsPostsGridProps {
  posts: CmsPost[];
  loading?: boolean;
  emptyMessage?: string;
  badgeLabel?: string;
}

export default function CmsPostsGrid({
  posts,
  loading,
  emptyMessage = 'No posts published yet.',
  badgeLabel,
}: CmsPostsGridProps) {
  if (loading) {
    return (
      <div className="row g-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-md-6 col-lg-4">
            <div
              className="blog-card animate-pulse"
              style={{ minHeight: 360, background: '#f1f5f9' }}
            >
              <div style={{ height: 220, background: '#e2e8f0' }} />
              <div className="blog-card-body">
                <div className="h-4 bg-slate-200 rounded mb-3 w-3/4" />
                <div className="h-3 bg-slate-100 rounded mb-2" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-4">
          <i className="bi bi-journal-text text-2xl" />
        </div>
        <p className="text-slate-500 font-medium text-lg">{emptyMessage}</p>
        <p className="text-slate-400 text-sm mt-2">
          Check back soon, or create content from the Admin Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {posts.map((post) => (
        <div key={post.id} className="col-md-6 col-lg-4">
          <CmsPostCard post={post} badgeLabel={badgeLabel} />
        </div>
      ))}
    </div>
  );
}
