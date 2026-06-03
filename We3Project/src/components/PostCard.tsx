import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Heart, MessageSquare, Share2, MoreHorizontal, Trash2, Flag, Send, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from './Toast';

interface PostCardProps {
  post: any;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const { showToast } = useToast();
  const currentUser = auth.currentUser;
  const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;

  // Real-time comments listener
  useEffect(() => {
    if (showComments && post.id && typeof post.id === 'string' && !post.id.startsWith('demo-')) {
      const q = query(
        collection(db, 'posts', post.id, 'comments'),
        orderBy('timestamp', 'asc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!currentUser) {
        showToast('Please login to like posts', 'info');
        return;
    }
    
    if (isLiking) return;
    
    if (!post.id || (typeof post.id === 'string' && post.id.startsWith('demo-'))) {
        showToast('Likes are not available for demo posts', 'info');
        return;
    }

    setIsLiking(true);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid)
        });
      }
    } catch (e) {
      console.error("Like error:", e);
      showToast('Failed to update like', 'error');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin + (post.id ? `?post=${post.id}` : '');
    const shareText = `Check out this update on FreeHunger: "${(post.text || '').substring(0, 50)}..."`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FreeHunger Update',
          text: shareText,
          url: shareUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (err) {
        console.error('Error sharing:', err);
        // User might have cancelled share, don't show error toast unless it's a real failure
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success');
      } catch (err) {
        console.error('Clipboard error:', err);
        showToast('Failed to copy link', 'error');
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login to comment', 'info');
      return;
    }
    if (!commentText.trim() || isSubmittingComment || post.id.startsWith('demo-')) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text: commentText,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: currentUser.photoURL || '',
        timestamp: serverTimestamp()
      });
      setCommentText('');
    } catch (e) {
      showToast('Failed to post comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      showToast('Post deleted', 'success');
    } catch (e) {
      showToast('Error deleting post', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold overflow-hidden shrink-0">
              {post.userAvatar ? (
                <img src={post.userAvatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="bg-emerald-600 text-white w-full h-full flex items-center justify-center text-lg">
                    {post.userName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                {post.userName}
                {post.id.startsWith('demo-') && (
                    <span className="bg-blue-100 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <ShieldCheck size={10} /> Verified
                    </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
              </div>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <MoreHorizontal size={18} />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                {currentUser?.uid === post.userId ? (
                  <button 
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                ) : (
                  <button className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <Flag size={14} /> Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-gray-800 text-[0.95rem] leading-normal mb-3 whitespace-pre-wrap font-normal px-1">
          {post.text}
        </div>

        {post.imageUrl && (
          <div className="mb-3 -mx-4 border-y border-gray-100 bg-gray-50">
            <img src={post.imageUrl} className="w-full max-h-[500px] object-contain mx-auto" alt="post" />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pb-3 px-1 border-b border-gray-100">
            <div className="flex items-center gap-1">
                {post.likes?.length > 0 && (
                    <>
                        <div className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white scale-75">
                            <Heart size={10} fill="white" />
                        </div>
                        <span>{post.likes.length}</span>
                    </>
                )}
            </div>
            <div className="flex gap-3">
                <span>{comments.length} comments</span>
                <span>0 shares</span>
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
              isLiked ? 'text-rose-600 hover:bg-rose-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            Like
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
              showComments ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare size={18} />
            Comment
          </button>

          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-gray-50/50 border-t border-gray-100 p-4">
          <div className="space-y-3 mb-4">
            {post.id.startsWith('demo-') ? (
                <p className="text-center text-[10px] font-bold text-gray-400 italic py-2">Comments disabled for demo posts</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-xs font-medium text-gray-400 py-2">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-[10px] shrink-0 overflow-hidden">
                    {comment.userAvatar ? (
                        <img src={comment.userAvatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                        comment.userName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 bg-gray-100 p-2.5 rounded-2xl">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-xs text-gray-900">{comment.userName}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {comment.timestamp ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-tight">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {!post.id.startsWith('demo-') && (
            <form onSubmit={handleAddComment} className="relative flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                   {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                        currentUser?.displayName?.charAt(0) || 'U'
                    )}
                </div>
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full bg-gray-100 border-0 focus:ring-0 rounded-full py-2 pl-4 pr-10 text-sm font-medium outline-none"
                    />
                    <button 
                        type="submit"
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all disabled:opacity-30"
                    >
                        {isSubmittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number; className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`lucide lucide-loader-2 ${className}`}
    >
      <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
    </svg>
);

export default PostCard;
