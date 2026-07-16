import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from './Toast';
import { useUserRole } from '../lib/useUserRole';
import { buildDonationPayload, newDonationRef } from '../lib/donations';

// Sub-components
import UserInfoBar from './Dashboard/UserInfoBar';
import WatchAndEarn from './Dashboard/WatchAndEarn';
import NgoList from './Dashboard/NgoList';
import DonateForm from './Dashboard/DonateForm';
import RecentDonations from './Dashboard/RecentDonations';
import Leaderboard from './Dashboard/Leaderboard';

const Dashboard = () => {
  const { profile: userData, loading: profileLoading } = useUserRole();
  const [donations, setDonations] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isWatching, setIsWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [donationAmount, setDonationAmount] = useState<number | ''>('');
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [resetTimer, setResetTimer] = useState('00:00:00');
  const { showToast } = useToast();
  
  const navigate = useNavigate();
  const countdownRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
      } else {
        // Donations listener
        const donationsRef = collection(db, 'users', currentUser.uid, 'donations');
        const q = query(donationsRef, orderBy('timestamp', 'desc'), limit(10));
        const unsubDonations = onSnapshot(q, (snapshot) => {
          setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubDonations();
      }
    });

    // NGOs listener
    const ngosRef = collection(db, 'Ngos');
    const unsubNgos = onSnapshot(ngosRef, (snapshot) => {
      const ngoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ngoList.sort((a: any, b: any) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        const pctA = (a.received || 0) / (a.goal || 1);
        const pctB = (b.received || 0) / (b.goal || 1);
        return pctA - pctB;
      });
      setNgos(ngoList);
    });

    // Leaderboard listener
    const leaderboardRef = collection(db, 'users');
    const lq = query(leaderboardRef, orderBy('donatedThisMonth', 'desc'), limit(10));
    const unsubLeaderboard = onSnapshot(lq, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeAuth();
      unsubNgos();
      unsubLeaderboard();
    };
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (userData?.lastAdReset) {
        const lastAdReset = (userData.lastAdReset as any).toDate ? (userData.lastAdReset as any).toDate() : new Date(userData.lastAdReset);
        const nextReset = new Date(lastAdReset.getTime() + 6 * 60 * 60 * 1000);
        const diff = nextReset.getTime() - new Date().getTime();
        
        if (diff <= 0) {
          setResetTimer('00:00:00');
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
          const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
          setResetTimer(`${h}:${m}:${s}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [userData]);

  const handleWatchVideo = async () => {
    if (isWatching || (userData?.videosToday || 0) >= 10) return;

    setIsWatching(true);
    setCountdown(3);
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          completeWatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeWatch = async () => {
    if (!userData) return;
    let baseCredits = 10;
    let bonusCredits = 0;
    const newVideosToday = (userData.videosToday || 0) + 1;

    if (newVideosToday === 3) bonusCredits = 30;
    else if (newVideosToday === 5) bonusCredits = 50;
    else if (newVideosToday === 10) bonusCredits = 150;

    const totalEarned = baseCredits + bonusCredits;
    
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        credits: increment(totalEarned),
        videosToday: increment(1),
        lastVideoDate: serverTimestamp()
      });
      showToast(`Earned Rs. ${totalEarned}!`, 'success');
      setIsWatching(false);
    } catch (error) {
      console.error("Watch failed:", error);
      setIsWatching(false);
    }
  };

  const handleDonate = async () => {
    if (!userData) return;
    if (!selectedNgoId || !donationAmount || donationAmount < 50) {
        showToast("Min. donation is Rs. 50", "error");
        return;
    }
    if (donationAmount > (userData.credits || 0)) {
        showToast("Insufficient credits!", "error");
        return;
    }

    const ngo = ngos.find(n => n.id === selectedNgoId);
    if (!ngo) return;

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userData.uid);
      const ngoRef = doc(db, 'Ngos', selectedNgoId);
      const historyRef = doc(collection(userRef, 'donations'));
      // ViewToHelp credit donations: auto-approved and visible on NGO Portal
      const portalDonationRef = newDonationRef(db);
      const donorName =
        userData.username || userData.name || userData.displayName || 'Anonymous donor';

      batch.update(userRef, {
        credits: increment(-donationAmount),
        totalDonated: increment(donationAmount),
        donatedThisMonth: increment(donationAmount)
      });

      batch.update(ngoRef, {
        received: increment(donationAmount)
      });

      batch.set(historyRef, {
        ngoName: ngo.name,
        amount: donationAmount,
        timestamp: serverTimestamp()
      });

      batch.set(
        portalDonationRef,
        buildDonationPayload({
          ngoId: selectedNgoId,
          ngoName: ngo.name,
          donorId: userData.uid,
          donorName,
          type: 'money',
          amount: donationAmount,
          status: 'approved',
          source: 'credits',
        })
      );

      await batch.commit();
      setDonationAmount('');
      setSelectedNgoId('');
      showToast("Donation successful!", "success");
    } catch (error) {
      console.error("Donation failed:", error);
      showToast("Error processing donation", "error");
    }
  };

  const handleNgoDonateClick = (ngoId: string) => {
    setSelectedNgoId(ngoId);
    setDonationAmount(100);
    document.getElementById('donate-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (profileLoading) return null;

  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4">
        
        <UserInfoBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <WatchAndEarn 
              videosToday={userData?.videosToday || 0}
              isWatching={isWatching}
              countdown={countdown}
              resetTimer={resetTimer}
              onWatch={handleWatchVideo}
            />

            <NgoList 
              ngos={ngos}
              filter={filter}
              setFilter={setFilter}
              onDonateClick={handleNgoDonateClick}
            />
          </div>

          <div className="space-y-8">
            <DonateForm 
              ngos={ngos}
              selectedNgoId={selectedNgoId}
              setSelectedNgoId={setSelectedNgoId}
              donationAmount={donationAmount}
              setDonationAmount={setDonationAmount}
              onDonate={handleDonate}
            />

            <RecentDonations donations={donations} />

            <Leaderboard 
              leaderboard={leaderboard} 
              currentUserUid={userData?.uid} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
