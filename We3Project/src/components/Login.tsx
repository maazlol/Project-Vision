import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, AtSign, AlertCircle, Loader2, Code2, Sparkles } from 'lucide-react';
import { useToast } from './Toast';
import minecraftImage from '../../Pictures/Minecraft.png';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'checking' | 'available' | 'taken'>('none');
  const { showToast } = useToast();
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [finalUsername, setFinalUsername] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const pendingDiscussionJoin = sessionStorage.getItem('pendingDiscussionJoin');
        const pendingGroupJoin = sessionStorage.getItem('pendingGroupJoin');
        if (userDoc.exists() && userDoc.data().username) {
          if (pendingGroupJoin) {
            sessionStorage.removeItem('pendingGroupJoin');
            navigate(`/chat/join/${encodeURIComponent(pendingGroupJoin)}`);
          } else {
            navigate(pendingDiscussionJoin ? `/discussions?join=${encodeURIComponent(pendingDiscussionJoin)}` : '/dashboard');
          }
        } else {
          setShowOnboarding(true);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (finalUsername.length >= 3) {
      const checkUsername = async () => {
        setUsernameStatus('checking');
        const q = query(collection(db, 'users'), where('username', '==', finalUsername.toLowerCase()));
        const querySnapshot = await getDocs(q);
        setUsernameStatus(querySnapshot.empty ? 'available' : 'taken');
      };
      const timeoutId = setTimeout(checkUsername, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameStatus('none');
    }
  }, [finalUsername]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Enter email and password.');

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Invalid login details or account not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Please fill all fields.');
    if (password.length < 8) return setError('Password must be 8+ characters.');
    if (!agreeTerms) return setError('Please agree to the Terms.');

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFinalizeSignup = async () => {
    if (!finalUsername || finalUsername.length < 3) {
      showToast('Username must be 3+ chars.', 'error');
      return;
    }
    if (usernameStatus === 'taken') return;

    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: finalUsername.toLowerCase(),
        name: user.displayName || finalUsername,
        credits: 0,
        joinedAt: serverTimestamp(),
        avatarType: 'emoji',
        avatarValue: '😊',
        avatarBg: '#f3f4f6'
      });
      showToast('Welcome to FreeHunger!', 'success');
      const pendingDiscussionJoin = sessionStorage.getItem('pendingDiscussionJoin');
      const pendingGroupJoin = sessionStorage.getItem('pendingGroupJoin');
      if (pendingGroupJoin) {
        sessionStorage.removeItem('pendingGroupJoin');
        navigate(`/chat/join/${encodeURIComponent(pendingGroupJoin)}`);
      } else {
        navigate(pendingDiscussionJoin ? `/discussions?join=${encodeURIComponent(pendingDiscussionJoin)}` : '/dashboard');
      }
    } catch (e: any) {
      showToast('Error saving profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError('Please enter your email above first.');
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Reset link sent to your email.', 'success');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-6">
        <div className="w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-2xl p-10 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 mx-auto shadow-inner">
              <Sparkles className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome to FreeHunger!</h2>
            <p className="text-gray-500 text-sm font-medium">Just one last step to start making an impact.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Choose Username</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={finalUsername}
                  onChange={(e) => setFinalUsername(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 font-bold placeholder:text-gray-300 transition-all outline-none"
                  placeholder="username"
                  required
                />
              </div>
              {usernameStatus !== 'none' && (
                <div className={`text-[0.75rem] mt-2 ml-1 font-bold ${usernameStatus === 'available' ? 'text-emerald-500' : usernameStatus === 'taken' ? 'text-rose-500' : 'text-gray-400'}`}>
                  {usernameStatus === 'checking' && 'Checking...'}
                  {usernameStatus === 'available' && '✅ This username is available!'}
                  {usernameStatus === 'taken' && '❌ Already taken. Try another.'}
                </div>
              )}
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-200">
                10
              </div>
              <p className="text-[0.75rem] text-emerald-800 font-bold leading-tight">
                Bonus: You'll get Rs. 10 credits immediately after setting up your profile!
              </p>
            </div>

            <button 
              onClick={handleFinalizeSignup}
              disabled={loading || finalUsername.length < 3 || usernameStatus === 'taken'}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'Complete Setup'}
            </button>
            
            <button onClick={() => auth.signOut().then(() => setShowOnboarding(false))} className="w-full text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors">
              Cancel & Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f9fafb]">
      {/* Navbar spacer */}
      <div className="lg:hidden h-16"></div>

      {/* Left side */}
      <div 
        className="hidden lg:flex lg:w-[45%] items-center justify-center p-12 sticky top-0 h-screen"
        style={{ background: 'linear-gradient(145deg, #064e3b 0%, #10b981 60%, #34d399 100%)' }}
      >
        <div className="max-w-[380px] text-white">
          <h2 className="text-[2.4rem] font-black leading-tight mb-2 tracking-tighter" style={{ background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FreeHunger
          </h2>
          <p className="text-[1.05rem] opacity-90 leading-relaxed mb-10 font-medium">
            Feed children by watching ads.
          </p>
          
          <div className="mb-8 text-center">
            <img src={minecraftImage} alt="Team Vision Developers" className="max-h-[300px] w-auto mx-auto" />
          </div>

          <div className="p-4 rounded-xl mb-8" style={{ background: 'rgba(255,255,255,0.12)', borderLeft: '4px solid white' }}>
            <p className="text-[0.95rem] leading-relaxed mb-0 font-medium italic">
              "This website was developed as a special project for <strong>Project Vision</strong>. 
              We are exploring and learning new things everyday because of it."
            </p>
          </div>

          <div className="flex items-center gap-2 text-white">
            <div className="bg-white rounded-full p-1.5 flex items-center justify-center text-[#10b981]">
              <Code2 size={18} />
            </div>
            <span className="font-bold tracking-tight">Team Vision Developers</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto min-h-screen">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-2xl shadow-lg p-9 animate-slide-up">
            <div className="flex p-1 bg-[#f9fafb] rounded-xl mb-7">
              <button 
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'login' ? 'bg-white text-[#10b981] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'signup' ? 'bg-white text-[#10b981] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg flex items-center gap-2.5 text-xs animate-shake">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-[#10b981] focus:ring-4 focus:ring-emerald-500/10 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-gray-700">Password</label>
                    <button type="button" onClick={handleForgotPassword} className="text-[0.82rem] font-semibold text-[#10b981] hover:underline">Forgot?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-[#10b981] focus:ring-4 focus:ring-emerald-500/10 rounded-xl py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#10b981] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#059669] transition-all flex items-center justify-center disabled:opacity-70 mt-4 shadow-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-[#10b981] focus:ring-4 focus:ring-emerald-500/10 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 ml-1">Create Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-[#10b981] focus:ring-4 focus:ring-emerald-500/10 rounded-xl py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                      placeholder="Min. 8 characters"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 ml-1 pt-1">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 text-[#10b981] border-gray-300 rounded focus:ring-[#10b981]"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600">I agree to Project Vision Terms</label>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#10b981] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#059669] transition-all flex items-center justify-center disabled:opacity-70 mt-4 shadow-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                </button>
              </form>
            )}

            <div className="flex items-center gap-3 my-7 text-gray-400 text-xs">
              <div className="flex-1 h-px bg-gray-100"></div>
              <span>or</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
