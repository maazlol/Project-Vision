import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  type CmsPost,
  type CmsPostCategory,
  type CmsPostInput,
  createCmsPost,
  updateCmsPost,
  deleteCmsPost,
  setCmsPostPublished,
  formatPostDate,
  getPostPath,
  slugify,
} from '../../lib/cmsPosts';
import { useAdminCmsPosts } from '../../lib/useCmsPosts';

const emptyForm: CmsPostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image: '',
  author: '',
  category: 'blog',
  published: false,
  featured: false,
};

export default function AdminManagePosts() {
  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    categoryFilter,
    setCategoryFilter,
  } = useAdminCmsPosts();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPost | null>(null);
  const [form, setForm] = useState<CmsPostInput>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!formOpen || editing || slugManual) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, formOpen, editing, slugManual]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugManual(false);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (post: CmsPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image,
      author: post.author,
      category: post.category,
      published: post.published,
      featured: post.featured,
    });
    setSlugManual(true);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setSlugManual(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!form.slug.trim() && !slugify(form.title)) {
      setFormError('Slug is required.');
      return;
    }
    if (!form.content.trim()) {
      setFormError('Content is required.');
      return;
    }
    if (!form.author.trim()) {
      setFormError('Author is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: CmsPostInput = {
        ...form,
        slug: form.slug.trim() || slugify(form.title),
      };
      if (editing) {
        await updateCmsPost(editing.id, payload);
      } else {
        await createCmsPost(payload);
      }
      closeForm();
      await refresh();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: CmsPost) => {
    setActionId(post.id);
    try {
      await setCmsPostPublished(post.id, !post.published);
      await refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update publish status.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (post: CmsPost) => {
    const ok = window.confirm(`Delete “${post.title}”? This cannot be undone.`);
    if (!ok) return;
    setActionId(post.id);
    try {
      await deleteCmsPost(post.id);
      await refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete post.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-0">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
            <Icons.Newspaper size={16} className="text-emerald-500" />
            Manage Posts
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Blog &amp; News CMS · collection <code className="text-emerald-600">cmsPosts</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CmsPostCategory | 'all')}
            className="bg-slate-50 border-0 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All categories</option>
            <option value="blog">Blog</option>
            <option value="news">News</option>
          </select>
          <button
            type="button"
            onClick={() => void refresh()}
            className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all inline-flex items-center gap-1.5"
          >
            <Icons.RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-200"
          >
            <Icons.Plus size={14} /> Create Post
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
          <Icons.AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Post</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <Icons.Loader2 className="animate-spin text-emerald-600 mx-auto" size={28} />
                </td>
              </tr>
            )}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                  No posts yet. Create your first blog or news article.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5">
                  <div className="flex items-start gap-3 min-w-[220px]">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {post.image ? (
                        <img src={post.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <Icons.Image size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-2">{post.title}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">/{post.slug}</div>
                      {post.featured && (
                        <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      post.category === 'news'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {post.category}
                  </span>
                </td>
                <td className="p-5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      post.published
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="p-5 text-xs text-slate-500 font-medium whitespace-nowrap">
                  {formatPostDate(post.createdAt) || '—'}
                </td>
                <td className="p-5 text-right">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {post.published && (
                      <Link
                        to={getPostPath(post)}
                        target="_blank"
                        className="bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all inline-flex items-center gap-1"
                      >
                        <Icons.ExternalLink size={14} /> View
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={actionId === post.id}
                      onClick={() => void handleTogglePublish(post)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 ${
                        post.published
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {post.published ? (
                        <>
                          <Icons.EyeOff size={14} /> Unpublish
                        </>
                      ) : (
                        <>
                          <Icons.Eye size={14} /> Publish
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all inline-flex items-center gap-1"
                    >
                      <Icons.Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={actionId === post.id}
                      onClick={() => void handleDelete(post)}
                      className="bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all inline-flex items-center gap-1"
                    >
                      <Icons.Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && (
        <div className="p-6 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all inline-flex items-center gap-2 disabled:opacity-60"
          >
            {loadingMore ? (
              <>
                <Icons.Loader2 className="animate-spin" size={14} /> Loading…
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-100">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-[2rem] z-10">
              <h3 className="font-black text-slate-900 text-lg">
                {editing ? 'Edit Post' : 'Create Post'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-sm font-bold flex items-start gap-2">
                  <Icons.AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}

              <Field label="Title *">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="field-input"
                  placeholder="How one meal changes a day"
                  required
                />
              </Field>

              <Field label="Slug *">
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm((f) => ({ ...f, slug: slugify(e.target.value) || e.target.value }));
                  }}
                  className="field-input font-mono text-sm"
                  placeholder="how-one-meal-changes-a-day"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  URL: /{form.category === 'news' ? 'news' : 'blog'}/{form.slug || '…'}
                </p>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Author *">
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    className="field-input"
                    placeholder="FreeHunger Team"
                    required
                  />
                </Field>
                <Field label="Category *">
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value as CmsPostCategory,
                      }))
                    }
                    className="field-input"
                  >
                    <option value="blog">Blog</option>
                    <option value="news">News</option>
                  </select>
                </Field>
              </div>

              <Field label="Image URL">
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  className="field-input"
                  placeholder="https://example.com/image.jpg"
                />
                {form.image && (
                  <img
                    src={form.image}
                    alt="Preview"
                    className="mt-2 h-28 w-full object-cover rounded-xl border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </Field>

              <Field label="Excerpt">
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  className="field-input min-h-[80px] resize-y"
                  placeholder="Short summary shown on listing cards…"
                  rows={3}
                />
              </Field>

              <Field label="Content *">
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="field-input min-h-[200px] resize-y font-medium"
                  placeholder="Write the full article here. Use blank lines to separate paragraphs."
                  rows={10}
                  required
                />
              </Field>

              <div className="flex flex-wrap gap-6 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Publish</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Featured</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Icons.Loader2 className="animate-spin" size={16} /> Saving…
                    </>
                  ) : editing ? (
                    <>
                      <Icons.Save size={16} /> Save Changes
                    </>
                  ) : (
                    <>
                      <Icons.Plus size={16} /> Create Post
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <style>{`
            .field-input {
              width: 100%;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 0.75rem;
              padding: 0.65rem 0.9rem;
              font-size: 0.875rem;
              font-weight: 500;
              color: #0f172a;
              outline: none;
              transition: box-shadow 0.15s, border-color 0.15s;
            }
            .field-input:focus {
              border-color: #10b981;
              box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
              background: #fff;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
