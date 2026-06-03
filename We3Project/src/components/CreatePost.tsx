import React, { useState } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Image, Send, X, Loader2, Smile } from 'lucide-react';
import { useToast } from './Toast';

const CreatePost = () => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { showToast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !image) return;

    setLoading(true);
    try {
      let imageUrl = '';
      if (image) {
        const imageRef = ref(storage, `posts/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const postData = {
        text,
        imageUrl,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Anonymous',
        userAvatar: auth.currentUser?.photoURL || '',
        timestamp: serverTimestamp(),
        likes: [],
        visibility,
        type: 'general'
      };

      await addDoc(collection(db, 'posts'), postData);
      
      setText('');
      setImage(null);
      setPreview(null);
      showToast('Post shared successfully!', 'success');
    } catch (e: any) {
      console.error("Post error:", e);
      showToast('Failed to share post.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0 overflow-hidden">
            {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} className="w-full h-full object-cover" alt="" />
            ) : (
                auth.currentUser?.displayName?.charAt(0) || 'U'
            )}
          </div>
          <div className="flex-1">
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`What's on your mind, ${auth.currentUser?.displayName?.split(' ')[0] || 'User'}?`}
              className="w-full border-0 focus:ring-0 text-base placeholder:text-gray-500 p-2 mt-1 resize-none min-h-[60px] bg-gray-50 rounded-xl"
            />
          </div>
        </div>

        {preview && (
          <div className="relative mb-4 rounded-xl overflow-hidden group border border-gray-100">
            <img src={preview} alt="Preview" className="w-full max-h-[300px] object-cover" />
            <button 
              type="button"
              onClick={() => { setImage(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-gray-900/60 text-white p-1.5 rounded-full hover:bg-gray-900/80 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all text-gray-600">
              <Image size={20} className="text-emerald-500" />
              <span className="text-sm font-semibold">Photo</span>
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </label>
            <button type="button" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all text-gray-600">
              <Smile size={20} className="text-amber-500" />
              <span className="text-sm font-semibold">Feeling</span>
            </button>
            <div className="relative">
              <select 
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="bg-transparent border-0 rounded-lg py-2 pl-2 pr-7 text-xs font-bold text-gray-500 appearance-none focus:ring-0 cursor-pointer hover:bg-gray-50 transition-all"
              >
                <option value="public">🌍 Public</option>
                <option value="friends">👥 Friends</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || (!text.trim() && !image)}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Send size={16} />
                Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
