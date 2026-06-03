import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Camera, User, MapPin, AlignLeft, Mail, Calendar, Trophy, LogOut, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

const Settings = () => {
  const [userData, setUserData] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarType, setAvatarType] = useState<'emoji' | 'image'>('emoji');
  const [avatarValue, setAvatarValue] = useState('😊');
  const [avatarBg, setAvatarBg] = useState('#f3f4f6');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'checking' | 'available' | 'taken'>('none');
  const { showToast } = useToast();
  
  const navigate = useNavigate();

  const emojis = ["😊", "😎", "🐱", "🐶", "🦁", "🐼", "🦊", "🐯", "🤖", "🚀", "🍕", "🍔"];
  const colors = ["#f3f4f6", "#fee2e2", "#fef3c7", "#d1fae5", "#dbeafe", "#ede9fe", "#fae8ff", "#ffedd5"];

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setUsername(data.username || '');
        setCity(data.city || '');
        setBio(data.bio || '');
        setAvatarType(data.avatarType || 'emoji');
        setAvatarValue(data.avatarValue || '😊');
        setAvatarBg(data.avatarBg || '#f3f4f6');
      }
    };
    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    if (username.length >= 3 && username !== userData?.username) {
      const checkUsername = async () => {
        setUsernameStatus('checking');
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        setUsernameStatus(querySnapshot.empty ? 'available' : 'taken');
      };
      const timeoutId = setTimeout(checkUsername, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameStatus('none');
    }
  }, [username, userData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarType('image');
        setAvatarValue(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken') return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const updateData = {
        username: username.toLowerCase(),
        city,
        bio,
        avatarType,
        avatarValue,
        avatarBg
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);
      await updateProfile(user, { displayName: username });
      
      showToast('Profile updated successfully!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      showToast('Error updating profile: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-slate-900">Profile Customization</h1>
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-colors">
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-12">
            
            {/* Avatar Customization */}
            <div className="md:col-span-5 flex flex-col items-center text-center">
              <h5 className="font-bold text-slate-900 mb-8 uppercase tracking-widest text-xs">Your Avatar</h5>
              
              <div 
                className="w-32 h-32 rounded-full border-4 border-emerald-500 flex items-center justify-center text-6xl shadow-2xl shadow-emerald-100 mb-8 relative group overflow-hidden"
                style={{ backgroundColor: avatarType === 'emoji' ? avatarBg : 'white' }}
              >
                {avatarType === 'image' ? (
                  <img src={avatarValue} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  avatarValue
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="text-white" size={32} />
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="w-full space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pick an Emoji</p>
                  <div className="grid grid-cols-6 gap-2">
                    {emojis.map(e => (
                      <button 
                        key={e}
                        type="button"
                        onClick={() => { setAvatarType('emoji'); setAvatarValue(e); }}
                        className={`text-2xl p-2 rounded-xl transition-all ${avatarType === 'emoji' && avatarValue === e ? 'bg-emerald-100 scale-110' : 'hover:bg-slate-50'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avatar Background</p>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setAvatarBg(c)}
                        className={`w-full aspect-square rounded-xl border-2 transition-all ${avatarBg === c ? 'border-slate-900 scale-105' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="md:col-span-7 space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 flex items-center gap-2">
                    <User size={16} className="text-emerald-500" /> Username
                  </label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-4 px-6 text-slate-900 font-medium transition-all"
                    placeholder="username"
                    required
                  />
                  {usernameStatus !== 'none' && (
                    <p className={`text-xs mt-2 ml-1 font-bold ${usernameStatus === 'available' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {usernameStatus === 'checking' && 'Checking...'}
                      {usernameStatus === 'available' && '✅ Username available!'}
                      {usernameStatus === 'taken' && '❌ Username taken.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-500" /> City
                  </label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-4 px-6 text-slate-900 font-medium transition-all"
                    placeholder="e.g. Karachi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 flex items-center gap-2">
                    <AlignLeft size={16} className="text-emerald-500" /> Bio
                  </label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={120}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-4 px-6 text-slate-900 font-medium transition-all resize-none"
                    placeholder="Tell us about yourself..."
                  />
                  <div className="text-right mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bio.length} / 120</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold flex items-center gap-2"><Mail size={14} /> Email</span>
                  <span className="text-slate-900 font-black">{userData?.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold flex items-center gap-2"><Calendar size={14} /> Joined</span>
                  <span className="text-slate-900 font-black">{userData?.joinedAt?.toDate().toLocaleDateString() || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold flex items-center gap-2"><Trophy size={14} /> Level</span>
                  <span className="text-emerald-600 font-black flex items-center gap-1">🥉 Bronze</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit" 
                  disabled={loading || usernameStatus === 'taken'}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : (
                    <>
                      <CheckCircle2 size={24} />
                      Save Profile
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => { auth.signOut(); navigate('/login'); }}
                  className="w-full bg-white border-2 border-slate-100 text-slate-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
