import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  type CmsPost,
  type CmsPostCategory,
  CMS_PAGE_SIZE,
  fetchPublishedPosts,
  fetchFeaturedPost,
  fetchHeroPosts,
  fetchRelatedPosts,
  getCmsPostBySlug,
  fetchAdminPosts,
} from './cmsPosts';

/** In-memory cache so revisiting Blog/News keeps prior content while refreshing. */
interface PublishedPostsCacheEntry {
  posts: CmsPost[];
  featured: CmsPost | null;
  heroPosts: CmsPost[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

const publishedPostsCache = new Map<string, PublishedPostsCacheEntry>();

function publishedCacheKey(
  category: CmsPostCategory,
  includeFeatured: boolean,
  includeHero: boolean,
  pageSize: number
): string {
  return `${category}|f:${includeFeatured ? 1 : 0}|h:${includeHero ? 1 : 0}|p:${pageSize}`;
}

interface UsePublishedPostsResult {
  posts: CmsPost[];
  featured: CmsPost | null;
  heroPosts: CmsPost[];
  /** True only while waiting for the first payload (no cached/local content yet). */
  loading: boolean;
  /** True when re-fetching with content already on screen. */
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePublishedPosts(
  category: CmsPostCategory,
  options?: { includeFeatured?: boolean; includeHero?: boolean; pageSize?: number }
): UsePublishedPostsResult {
  const includeFeatured = options?.includeFeatured ?? true;
  const includeHero = options?.includeHero ?? false;
  const pageSize = options?.pageSize ?? CMS_PAGE_SIZE;
  const cacheKey = publishedCacheKey(category, includeFeatured, includeHero, pageSize);
  const cached = publishedPostsCache.get(cacheKey);

  const [posts, setPosts] = useState<CmsPost[]>(() => cached?.posts ?? []);
  const [featured, setFeatured] = useState<CmsPost | null>(() => cached?.featured ?? null);
  const [heroPosts, setHeroPosts] = useState<CmsPost[]>(() => cached?.heroPosts ?? []);
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => cached?.hasMore ?? false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(
    () => cached?.lastDoc ?? null
  );

  // Track whether we currently have displayable content (for cold vs warm load).
  const hasContentRef = useRef(
    Boolean(cached && (cached.posts.length > 0 || cached.featured || cached.heroPosts.length > 0))
  );

  const writeCache = useCallback(
    (entry: PublishedPostsCacheEntry) => {
      publishedPostsCache.set(cacheKey, entry);
    },
    [cacheKey]
  );

  const loadInitial = useCallback(async () => {
    const warm = hasContentRef.current;
    if (warm) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [page, featuredPost, heroes] = await Promise.all([
        fetchPublishedPosts(category, pageSize),
        includeFeatured ? fetchFeaturedPost(category) : Promise.resolve(null),
        includeHero ? fetchHeroPosts(category, 3) : Promise.resolve([] as CmsPost[]),
      ]);

      setPosts(page.posts);
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
      setFeatured(featuredPost);
      setHeroPosts(heroes);
      hasContentRef.current =
        page.posts.length > 0 || Boolean(featuredPost) || heroes.length > 0;
      writeCache({
        posts: page.posts,
        featured: featuredPost,
        heroPosts: heroes,
        hasMore: page.hasMore,
        lastDoc: page.lastDoc,
      });
    } catch (err) {
      console.error('usePublishedPosts:', err);
      setError('Could not load posts. Please try again later.');
      // Keep prior content if we have it; only clear on a true cold failure.
      if (!hasContentRef.current) {
        setPosts([]);
        setFeatured(null);
        setHeroPosts([]);
        setHasMore(false);
        setCursor(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, includeFeatured, includeHero, pageSize, writeCache]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchPublishedPosts(category, pageSize, cursor);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = page.posts.filter((p) => !seen.has(p.id));
        const merged = [...prev, ...next];
        writeCache({
          posts: merged,
          featured,
          heroPosts,
          hasMore: page.hasMore,
          lastDoc: page.lastDoc,
        });
        return merged;
      });
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('usePublishedPosts loadMore:', err);
      setError('Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [category, cursor, featured, hasMore, heroPosts, loadingMore, pageSize, writeCache]);

  return {
    posts,
    featured,
    heroPosts,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh: loadInitial,
  };
}

interface UseCmsPostResult {
  post: CmsPost | null;
  related: CmsPost[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

export function useCmsPostBySlug(slug: string | undefined): UseCmsPostResult {
  const [post, setPost] = useState<CmsPost | null>(null);
  const [related, setRelated] = useState<CmsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setPost(null);
      setRelated([]);
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const found = await getCmsPostBySlug(slug);
        if (cancelled) return;

        if (!found || !found.published) {
          setPost(null);
          setRelated([]);
          setNotFound(true);
          return;
        }

        setPost(found);
        const relatedPosts = await fetchRelatedPosts(found.category, found.id);
        if (!cancelled) setRelated(relatedPosts);
      } catch (err) {
        console.error('useCmsPostBySlug:', err);
        if (!cancelled) {
          setError('Could not load this article.');
          setPost(null);
          setRelated([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { post, related, loading, error, notFound };
}

interface UseAdminPostsResult {
  posts: CmsPost[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setCategoryFilter: (c: CmsPostCategory | 'all') => void;
  categoryFilter: CmsPostCategory | 'all';
}

export function useAdminCmsPosts(): UseAdminPostsResult {
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CmsPostCategory | 'all'>('all');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchAdminPosts(20, null, categoryFilter);
      setPosts(page.posts);
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('useAdminCmsPosts:', err);
      setError('Could not load posts. Confirm Firestore rules for cmsPosts are deployed.');
      setPosts([]);
      setHasMore(false);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchAdminPosts(20, cursor, categoryFilter);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('useAdminCmsPosts loadMore:', err);
      setError('Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [categoryFilter, cursor, hasMore, loadingMore]);

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh: loadInitial,
    setCategoryFilter,
    categoryFilter,
  };
}
