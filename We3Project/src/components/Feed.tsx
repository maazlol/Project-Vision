import React, { useState, useEffect } from 'react';
import { useFeed } from '../lib/useFeed';
import { useUserRole } from '../lib/useUserRole';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import { Flame, Trophy, Info, ShieldCheck, Check, Users } from 'lucide-react';
import { useToast } from './Toast';

interface Campaign {
  id: string;
  title: string;
  current: number;
  target: number;
  color: string;
}

interface TopDonor {
  uid: string;
  displayName: string;
  totalDonated: number;
  initials: string;
}

interface FeedProps {
  onSwitchTab?: () => void;
}

const Feed: React.FC<FeedProps> = ({ onSwitchTab }) => {
  const [filter] = useState('all');
  const [searchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [onlineCount, setOnlineCount] = useState(142);
  const { showToast } = useToast();

  const { posts, loading, error } = useFeed(filter);
  const { profile } = useUserRole();

  const demoPosts = [
    {
      id: 'demo-1',
      text: 'Alhumdulillah! Today we distributed 100+ hot meals to children in rural areas of Sindh. Your credits make this possible! 🍲✨',
      imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
      userId: 'demo-ngo-id',
      userName: 'Demo NGO',
      userAvatar: '',
      timestamp: { toDate: () => new Date() },
      likes: ['user1', 'user2'],
      visibility: 'public'
    },
    {
      id: 'demo-2',
      text: 'Clean water is a basic right. Our new solar-powered water pump is now operational in Thar, serving 50+ families. 💧☀️',
      imageUrl: 'https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=800&q=80',
      userId: 'demo-ngo-id',
      userName: 'Demo NGO',
      userAvatar: '',
      timestamp: { toDate: () => new Date(Date.now() - 86400000) },
      likes: ['user3'],
      visibility: 'public'
    },
    {
      id: 'demo-3',
      text: 'Back to school! We just provided stationery kits to 30 students. Education is the best weapon against poverty. 📚✏️',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      userId: 'demo-ngo-id',
      userName: 'Demo NGO',
      userAvatar: '',
      timestamp: { toDate: () => new Date(Date.now() - 172800000) },
      likes: ['user4', 'user5', 'user6'],
      visibility: 'public'
    }
  ];

  const allPosts = [...posts, ...demoPosts].sort((a: any, b: any) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
    return timeB - timeA;
  });

  const filteredPosts = allPosts.filter(post => 
    post.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // Online count animation
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(120, prev + change);
      });
    }, 5000);

    // Fetch Campaigns
    const qC = query(collection(db, 'campaigns'), limit(3));
    const unsubC = onSnapshot(qC, (snapshot) => {
      const camps: Campaign[] = [];
      snapshot.forEach((doc) => {
        camps.push({ id: doc.id, ...doc.data() } as Campaign);
      });
      if (camps.length === 0) {
        setCampaigns([
          { id: '1', title: 'Thar School Solar Project', current: 42000, target: 100000, color: 'bg-emerald-500' },
          { id: '2', title: 'Ramadan Meal Drive 2026', current: 67000, target: 100000, color: 'bg-orange-500' }
        ]);
      } else {
        setCampaigns(camps);
      }
    });

    // Fetch Top Donors
    const qD = query(collection(db, 'users'), orderBy('totalDonated', 'desc'), limit(3));
    const unsubD = onSnapshot(qD, (snapshot) => {
      const donors: TopDonor[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.totalDonated > 0) {
          const name = data.displayName || data.name || 'Anonymous';
          donors.push({
            uid: doc.id,
            displayName: name,
            totalDonated: data.totalDonated,
            initials: name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          });
        }
      });
      if (donors.length === 0) {
        setTopDonors([
          { uid: 's1', displayName: 'Fatima K.', totalDonated: 2500, initials: 'F' },
          { uid: 's2', displayName: 'Ali Raza', totalDonated: 1800, initials: 'A' },
          { uid: 's3', displayName: 'Zara M.', totalDonated: 1200, initials: 'Z' }
        ]);
      } else {
        setTopDonors(donors);
      }
    });

    return () => {
      clearInterval(interval);
      unsubC();
      unsubD();
    };
  }, []);

  const handleVerifyRequest = async () => {
    if (!profile) return;
    setIsVerifying(true);
    try {
      await setDoc(doc(db, 'verificationRequests', profile.uid), {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        status: 'pending',
        requestedAt: serverTimestamp()
      });
      setVerificationSuccess(true);
      showToast('Verification request sent!', 'success');
    } catch (e) {
      console.error("Verification error:", e);
      showToast("Failed to send request.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const ranks = ['🥇', '🥈', '🥉'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main Feed */}
        <div className="flex-grow lg:w-2/3">
          {profile && (
            <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-600">
                  <Info size={20} />
                </div>
                <p className="text-emerald-800 text-sm">
                  Welcome back, <span className="font-bold">{profile.displayName}</span>! 
                  {profile.role === 'ngo' && !profile.isVerified && " Your NGO account is pending verification."}
                  {profile.role === 'ngo' && profile.isVerified && " Your NGO is verified. You can now post updates."}
                  {profile.role !== 'ngo' && " Share and inspire others with your impact!"}
                </p>
              </div>
              
              {profile.role === 'ngo' && !profile.isVerified && !verificationSuccess && (
                <button 
                  onClick={handleVerifyRequest}
                  disabled={isVerifying}
                  className="bg-amber-500 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  {isVerifying ? "Sending..." : <><ShieldCheck size={16} /> Verify My NGO</>}
                </button>
              )}
              {verificationSuccess && (
                <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                  <Check size={16} /> Request Sent
                </div>
              )}
            </div>
          )}

          {/* Only NGOs and Volunteers can see CreatePost */}
          {(profile?.role === 'ngo' || profile?.role === 'volunteer') && <CreatePost />}

          {/* Posts */}
          <div className="space-y-6">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-500 font-medium">Loading feed...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-red-100">
                <p className="font-bold">Error loading feed</p>
              </div>
            )}

            {!loading && filteredPosts.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">No posts found!</h3>
              </div>
            )}

            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/3 space-y-6">
          {/* Your Stats */}
          {profile && (
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg border border-white/30">
                  {profile.displayName?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
                <div>
                  <div className="font-bold">{profile.displayName} (You)</div>
                  <div className="text-xs opacity-75 uppercase tracking-wider font-semibold">{profile.role}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase opacity-75 font-bold mb-1">Available Credits</div>
                  <div className="text-lg font-black">Rs. {(profile.credits || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase opacity-75 font-bold mb-1">Total Donated</div>
                  <div className="text-lg font-black">Rs. {(profile.totalDonated || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Active Campaigns */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h6 className="flex items-center gap-2 text-gray-900 font-bold mb-6">
              <Flame size={20} className="text-orange-500" />
              Active Campaigns
            </h6>
            <div className="space-y-6">
              {campaigns.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between items-end mb-2">
                    <strong className="text-sm text-gray-800">{c.title}</strong>
                    <span className="text-xs font-bold text-gray-500">{Math.round((c.current/c.target)*100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${c.color || 'bg-emerald-500'} rounded-full transition-all duration-1000`} 
                      style={{ width: `${(c.current/c.target)*100}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    Rs. {c.current.toLocaleString()} / Rs. {c.target.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Donors */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h6 className="flex items-center gap-2 text-gray-900 font-bold mb-6">
              <Trophy size={20} className="text-amber-500" />
              Top Donors This Week
            </h6>
            <div className="space-y-4">
              {topDonors.map((d, i) => (
                <div key={d.uid} className="flex items-center gap-3">
                  <span className="text-lg w-6">{ranks[i] || '✨'}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    {d.initials}
                  </div>
                  <div className="flex-grow">
                    <div className="text-sm font-bold text-gray-800">{d.displayName}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">Rs. {d.totalDonated.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Online Count */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Users size={18} className="text-gray-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Online Now</span>
            </div>
            <div className="text-sm font-black text-emerald-600">{onlineCount}</div>
          </div>

          {/* Volunteer CTA */}
          <div className="bg-emerald-600/5 border border-emerald-600/10 rounded-2xl p-8 text-center">
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">Become a Volunteer!</h4>
            <p className="text-sm text-gray-600 mb-6">NGOs need your help. Donate your time to make a difference.</p>
            <button 
              onClick={onSwitchTab}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              Join as Volunteer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Feed;
