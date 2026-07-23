import type { CmsPost } from '../../lib/cmsPosts';
import CmsPostCard from './CmsPostCard';

interface CmsPostsGridProps {
  posts: CmsPost[];
  loading?: boolean;
  emptyMessage?: string;
  badgeLabel?: string;
  /** Bootstrap column class for each card. Default: three columns on large screens. */
  columnClass?: string;
}

function GridCardSkeleton({ columnClass }: { columnClass: string }) {
  return (
    <div className={columnClass}>
      <article className="blog-card cms-card-skeleton" aria-hidden>
        <div className="blog-card-img-wrap cms-skel-media">
          <div className="cms-skel-shimmer" />
        </div>
        <div className="blog-card-body">
          <div className="cms-skel-line cms-skel-line--title" />
          <div className="cms-skel-line cms-skel-line--body" />
          <div className="cms-skel-line cms-skel-line--body short" />
          <div className="cms-skel-meta">
            <div className="cms-skel-line cms-skel-line--meta" />
            <div className="cms-skel-line cms-skel-line--meta short" />
          </div>
        </div>
      </article>
    </div>
  );
}

export default function CmsPostsGrid({
  posts,
  loading,
  emptyMessage = 'No posts published yet.',
  badgeLabel,
  columnClass = 'col-md-6 col-lg-4',
}: CmsPostsGridProps) {
  // Keep real cards visible when content already exists (background refresh).
  if (loading && posts.length === 0) {
    return (
      <div className="row g-4" aria-busy="true" aria-label="Loading posts">
        {Array.from({ length: 4 }).map((_, i) => (
          <GridCardSkeleton key={i} columnClass={columnClass} />
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
        <div key={post.id} className={columnClass}>
          <CmsPostCard post={post} badgeLabel={badgeLabel} />
        </div>
      ))}
    </div>
  );
}
