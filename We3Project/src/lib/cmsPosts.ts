/**
 * CMS Blog & News posts.
 *
 * Collection name is `cmsPosts` (not `posts`) because `posts` is already used
 * by the social Impact Feed and must not be modified.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/** Firestore collection for Blog & News CMS content */
export const CMS_POSTS_COLLECTION = 'cmsPosts';

export type CmsPostCategory = 'blog' | 'news';

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  category: CmsPostCategory;
  published: boolean;
  featured: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CmsPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  category: CmsPostCategory;
  published: boolean;
  featured: boolean;
}

export const CMS_PAGE_SIZE = 9;
export const RELATED_POSTS_LIMIT = 4;

function mapDoc(snap: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): CmsPost {
  const data = typeof snap.data === 'function' ? snap.data() : (snap as QueryDocumentSnapshot).data();
  return {
    id: snap.id,
    title: (data.title as string) || '',
    slug: (data.slug as string) || '',
    excerpt: (data.excerpt as string) || '',
    content: (data.content as string) || '',
    image: (data.image as string) || '',
    author: (data.author as string) || '',
    category: (data.category as CmsPostCategory) || 'blog',
    published: Boolean(data.published),
    featured: Boolean(data.featured),
    createdAt: (data.createdAt as Timestamp) || null,
    updatedAt: (data.updatedAt as Timestamp) || null,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function formatPostDate(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return ts.toDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getPostPath(post: Pick<CmsPost, 'category' | 'slug'>): string {
  return post.category === 'news' ? `/news/${post.slug}` : `/blog/${post.slug}`;
}

export function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Returns true if another document already uses this slug. */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const q = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('slug', '==', slug),
    limit(5)
  );
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== excludeId);
}

export async function createCmsPost(input: CmsPostInput): Promise<string> {
  const slug = input.slug.trim() || slugify(input.title);
  if (!slug) throw new Error('Slug is required.');
  if (await isSlugTaken(slug)) {
    throw new Error('A post with this slug already exists. Choose a unique slug.');
  }

  const ref = await addDoc(collection(db, CMS_POSTS_COLLECTION), {
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    image: input.image.trim(),
    author: input.author.trim(),
    category: input.category,
    published: Boolean(input.published),
    featured: Boolean(input.featured),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCmsPost(id: string, input: CmsPostInput): Promise<void> {
  const slug = input.slug.trim() || slugify(input.title);
  if (!slug) throw new Error('Slug is required.');
  if (await isSlugTaken(slug, id)) {
    throw new Error('A post with this slug already exists. Choose a unique slug.');
  }

  await updateDoc(doc(db, CMS_POSTS_COLLECTION, id), {
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    image: input.image.trim(),
    author: input.author.trim(),
    category: input.category,
    published: Boolean(input.published),
    featured: Boolean(input.featured),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCmsPost(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_POSTS_COLLECTION, id));
}

export async function setCmsPostPublished(id: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, CMS_POSTS_COLLECTION, id), {
    published,
    updatedAt: serverTimestamp(),
  });
}

export async function getCmsPostById(id: string): Promise<CmsPost | null> {
  const snap = await getDoc(doc(db, CMS_POSTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapDoc({ id: snap.id, data: () => snap.data() });
}

export async function getCmsPostBySlug(slug: string): Promise<CmsPost | null> {
  // Must include published == true so public queries satisfy security rules
  // (list rules reject queries that could return unpublished docs).
  const q = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('slug', '==', slug),
    where('published', '==', true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapDoc(snap.docs[0]);
}

export interface PaginatedPosts {
  posts: CmsPost[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/** Public listing: published posts only, newest first. */
export async function fetchPublishedPosts(
  category: CmsPostCategory,
  pageSize: number = CMS_PAGE_SIZE,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedPosts> {
  const col = collection(db, CMS_POSTS_COLLECTION);
  const q = cursor
    ? query(
        col,
        where('category', '==', category),
        where('published', '==', true),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      )
    : query(
        col,
        where('category', '==', category),
        where('published', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );

  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  return {
    posts: pageDocs.map(mapDoc),
    lastDoc: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

/** Featured published post for a category (newest featured first). */
export async function fetchFeaturedPost(category: CmsPostCategory): Promise<CmsPost | null> {
  const q = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('category', '==', category),
    where('published', '==', true),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapDoc(snap.docs[0]);
}

/** Featured/latest published posts for news hero (up to 3). */
export async function fetchHeroPosts(category: CmsPostCategory, count = 3): Promise<CmsPost[]> {
  // Prefer featured first; fill with latest published if needed
  const featuredQ = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('category', '==', category),
    where('published', '==', true),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const featuredSnap = await getDocs(featuredQ);
  const featured = featuredSnap.docs.map(mapDoc);
  if (featured.length >= count) return featured;

  const latestQ = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('category', '==', category),
    where('published', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const latestSnap = await getDocs(latestQ);
  const latest = latestSnap.docs.map(mapDoc);
  const seen = new Set(featured.map((p) => p.id));
  for (const p of latest) {
    if (seen.has(p.id)) continue;
    featured.push(p);
    if (featured.length >= count) break;
  }
  return featured;
}

export async function fetchRelatedPosts(
  category: CmsPostCategory,
  excludeId: string,
  max: number = RELATED_POSTS_LIMIT
): Promise<CmsPost[]> {
  const q = query(
    collection(db, CMS_POSTS_COLLECTION),
    where('category', '==', category),
    where('published', '==', true),
    orderBy('createdAt', 'desc'),
    limit(max + 4)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapDoc)
    .filter((p) => p.id !== excludeId)
    .slice(0, max);
}

/** Admin: all posts (published + drafts), newest first, with pagination. */
export async function fetchAdminPosts(
  pageSize: number = 20,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  categoryFilter?: CmsPostCategory | 'all'
): Promise<PaginatedPosts> {
  if (categoryFilter && categoryFilter !== 'all') {
    const q = cursor
      ? query(
          collection(db, CMS_POSTS_COLLECTION),
          where('category', '==', categoryFilter),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(pageSize + 1)
        )
      : query(
          collection(db, CMS_POSTS_COLLECTION),
          where('category', '==', categoryFilter),
          orderBy('createdAt', 'desc'),
          limit(pageSize + 1)
        );
    const snap = await getDocs(q);
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    return {
      posts: pageDocs.map(mapDoc),
      lastDoc: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  }

  const q = cursor
    ? query(
        collection(db, CMS_POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      )
    : query(
        collection(db, CMS_POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );

  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    posts: pageDocs.map(mapDoc),
    lastDoc: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}
