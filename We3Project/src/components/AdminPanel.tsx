import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import * as Icons from 'lucide-react';
import { useUserRole } from '../lib/useUserRole';
import { Link as RouterLink } from 'react-router-dom';
import {
  type DonationRecord,
  type DonationStatus,
  donationTimestampToDate,
  formatDonationStatus,
  statusBadgeClasses,
} from '../lib/donations';
import { DemoNgoSeedError, seedDemoNgo } from '../lib/seedDemoNgo';
import AdminManagePosts from './cms/AdminManagePosts';

// --- Interfaces ---

export interface Sponsor {
  id: string;
  name: string;
  tid: string;
  /** Legacy / payment-form alias for tid */
  transactionId?: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl: string;
  adUrl?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  type?: 'corporate' | 'individual';
  budget?: string;
  amount?: number;
  package?: string;
}

export interface Volunteer {
  id: string;
  userId?: string;
  name: string;
  cnic: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  cnicFront?: string;
  cnicBack?: string;
  selfie?: string;
  email?: string;
  phone?: string;
  city?: string;
  bio?: string;
  interests?: string;
  submittedAt?: any;
}

export interface ActiveVolunteer {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  city?: string;
  phone?: string;
  role?: string;
  isVolunteer?: boolean;
  isVerified?: boolean;
}

export interface NgoRegisterApplication {
  id: string;
  userId?: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  website?: string;
  description?: string;
  registrationNumber?: string;
  registrationType?: string;
  yearEstablished?: string;
  bankDetails?: string;
  easypaisa?: string;
  jazzcash?: string;
  registrationCert?: string;
  taxCert?: string;
  authorizationLetter?: string;
  status: 'pending' | 'approved' | 'rejected';
  ngoId?: string;
  submittedAt?: any;
}

export interface ActiveNgo {
  id: string;
  name?: string;
  city?: string;
  contact?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  bankDetails?: string;
  easypaisa?: string;
  jazzcash?: string;
  ownerUid?: string;
  verified?: boolean;
  logoUrl?: string;
  received?: number;
  goal?: number;
}

type TabType =
  | 'dashboard'
  | 'sponsors'
  | 'volunteers'
  | 'activeVolunteers'
  | 'ngoRegister'
  | 'activeNgos'
  | 'ngoDonations'
  | 'managePosts';

const SECTION_META: Record<
  Exclude<TabType, 'dashboard'>,
  { label: string; description: string; icon: keyof typeof Icons }
> = {
  managePosts: {
    label: 'Posts',
    description: 'Create, edit, and publish CMS content',
    icon: 'Newspaper',
  },
  sponsors: {
    label: 'Sponsors',
    description: 'Review sponsorship applications',
    icon: 'Heart',
  },
  volunteers: {
    label: 'Volunteers',
    description: 'KYC and volunteer applications',
    icon: 'Users',
  },
  activeVolunteers: {
    label: 'Active Volunteers',
    description: 'Manage posting permissions',
    icon: 'UserCheck',
  },
  ngoRegister: {
    label: 'NGO Applications',
    description: 'Review NGO registration requests',
    icon: 'ClipboardList',
  },
  activeNgos: {
    label: 'Active NGOs',
    description: 'Portal-enabled organization profiles',
    icon: 'Building2',
  },
  ngoDonations: {
    label: 'Donations',
    description: 'Verify NGO donations and receipts',
    icon: 'HandHeart',
  },
};

export default function AdminPanel() {
  const { profile, loading: authLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Partial<Record<TabType, boolean>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<{ data: any; type: 'volunteer' | 'sponsor' | 'ngoRegister' } | null>(null);
  const [activeKycImage, setActiveKycImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activeVolunteers, setActiveVolunteers] = useState<ActiveVolunteer[]>([]);
  const [ngoRegisterApps, setNgoRegisterApps] = useState<NgoRegisterApplication[]>([]);
  const [activeNgos, setActiveNgos] = useState<ActiveNgo[]>([]);
  const [ngoDonations, setNgoDonations] = useState<DonationRecord[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [donationActionLoading, setDonationActionLoading] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    if (activeTab === 'dashboard') return;
    if (activeTab === 'ngoDonations') return;
    // CMS posts manage their own data loading
    if (activeTab === 'managePosts') return;

    // Active NGOs: live snapshot so latest NGO Profile always shows
    if (activeTab === 'activeNgos') {
      setIsLoading(true);
      setError(null);
      const unsub = onSnapshot(
        collection(db, 'Ngos'),
        (snapshot) => {
          const rows = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as ActiveNgo))
            .filter((n) => n.verified !== false)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setActiveNgos(rows);
          setLoadedSections((prev) => ({ ...prev, activeNgos: true }));
          setIsLoading(false);
        },
        (err) => {
          console.error(err);
          setError('Could not load Active NGOs.');
          setIsLoading(false);
        }
      );
      return () => unsub();
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const collectionName =
          activeTab === 'activeVolunteers'
            ? 'users'
            : activeTab === 'ngoRegister'
              ? 'ngoRegister'
              : activeTab;
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        if (activeTab === 'sponsors') setSponsors(data as Sponsor[]);
        else if (activeTab === 'volunteers') setVolunteers(data as Volunteer[]);
        else if (activeTab === 'activeVolunteers') {
          setActiveVolunteers((data as ActiveVolunteer[]).filter((user) => user.role === 'volunteer'));
        }
        else if (activeTab === 'ngoRegister') {
          setNgoRegisterApps(
            (data as NgoRegisterApplication[]).sort((a, b) => {
              const order = { pending: 0, approved: 1, rejected: 2 };
              return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            })
          );
        }
        setLoadedSections((prev) => ({ ...prev, [activeTab]: true }));
      } catch (err: any) {
        console.error(`Error fetching ${activeTab}:`, err);
        setError(`Could not load ${activeTab} data.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, profile]);

  // Live NGO donations ledger (status changes appear immediately in NGO Portal)
  useEffect(() => {
    if (profile?.role !== 'admin' || activeTab !== 'ngoDonations') return;

    setIsLoading(true);
    setError(null);

    const mapDocs = (docs: { id: string; data: () => Record<string, unknown> }[]) => {
      const rows = docs.map((d) => ({ id: d.id, ...d.data() } as DonationRecord));
      rows.sort((a, b) => {
        const ta = donationTimestampToDate(a.timestamp)?.getTime() || 0;
        const tb = donationTimestampToDate(b.timestamp)?.getTime() || 0;
        return tb - ta;
      });
      return rows;
    };

    // Prefer ordered query; fall back if index is missing
    const ordered = query(collection(db, 'donations'), orderBy('timestamp', 'desc'));
    let activeUnsub: (() => void) | undefined;

    activeUnsub = onSnapshot(
      ordered,
      (snapshot) => {
        setNgoDonations(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DonationRecord))
        );
        setLoadedSections((prev) => ({ ...prev, ngoDonations: true }));
        setIsLoading(false);
      },
      () => {
        activeUnsub?.();
        activeUnsub = onSnapshot(
          collection(db, 'donations'),
          (snapshot) => {
            setNgoDonations(mapDocs(snapshot.docs));
            setLoadedSections((prev) => ({ ...prev, ngoDonations: true }));
            setIsLoading(false);
            setError(null);
          },
          (fallbackErr) => {
            console.error(fallbackErr);
            setError('Could not load NGO donations. Confirm firestore.rules are deployed.');
            setIsLoading(false);
          }
        );
      }
    );

    return () => activeUnsub?.();
  }, [activeTab, profile]);

  const handleAction = async (tab: TabType, id: string, action: string) => {
    setIsLoading(true);
    try {
      const collectionName =
        tab === 'activeVolunteers'
          ? 'users'
          : tab === 'ngoRegister'
            ? 'ngoRegister'
            : tab === 'activeNgos'
              ? 'Ngos'
              : tab;
      const docRef = doc(db, collectionName, id);
      let updateData: any = {};

      if (action === 'approve') updateData = { status: 'approved' };
      else if (action === 'reject') updateData = { status: 'rejected' };
      else if (action === 'revoke') updateData = {
        role: 'supporter',
        isVolunteer: false,
        isVerified: false,
        volunteerRevokedAt: serverTimestamp()
      };

      if (tab === 'volunteers') {
        const volunteerData = volunteers.find(v => v.id === id);
        const batch = writeBatch(db);
        batch.update(docRef, {
          ...updateData,
          ...(action === 'approve' ? { approvedAt: serverTimestamp() } : {}),
          ...(action === 'reject' ? { rejectedAt: serverTimestamp() } : {})
        });

        if (volunteerData?.userId) {
          const userRef = doc(db, 'users', volunteerData.userId);
          
          if (action === 'approve') {
            batch.set(userRef, { 
              uid: volunteerData.userId,
              name: volunteerData.name,
              displayName: volunteerData.name,
              email: volunteerData.email || '',
              phone: volunteerData.phone || '',
              city: volunteerData.city || '',
              role: 'volunteer',
              isVerified: true,
              isVolunteer: true,
              volunteerApplicationId: id,
              volunteerApprovedAt: serverTimestamp()
            }, { merge: true });
          } else if (action === 'reject') {
            batch.set(userRef, { 
              role: 'supporter',
              isVolunteer: false,
              isVerified: false,
              volunteerApplicationId: id,
              volunteerRejectedAt: serverTimestamp()
            }, { merge: true });
          }
        }

        await batch.commit();
      } else if (tab === 'ngoRegister') {
        const app = ngoRegisterApps.find((a) => a.id === id);
        const batch = writeBatch(db);

        if (action === 'approve' && app) {
          const ngoId = app.ngoId || `ngo-${id}`;
          const ngoRef = doc(db, 'Ngos', ngoId);

          batch.set(
            ngoRef,
            {
              name: app.name,
              ownerUid: app.userId || null,
              description: app.description || '',
              contact: app.email || '',
              phone: app.phone || '',
              address: app.address || '',
              city: app.city || '',
              website: app.website || '',
              bankDetails: app.bankDetails || '',
              easypaisa: app.easypaisa || '',
              jazzcash: app.jazzcash || '',
              registrationNumber: app.registrationNumber || '',
              registrationType: app.registrationType || '',
              yearEstablished: app.yearEstablished || '',
              type: 'ngo',
              category: 'Community',
              verified: true,
              urgent: false,
              goal: 100000,
              received: 0,
              applicationId: id,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          batch.update(docRef, {
            status: 'approved',
            ngoId,
            approvedAt: serverTimestamp(),
          });

          if (app.userId) {
            batch.set(
              doc(db, 'users', app.userId),
              {
                uid: app.userId,
                name: app.contactName || app.name,
                displayName: app.contactName || app.name,
                email: app.email || '',
                phone: app.phone || '',
                city: app.city || '',
                role: 'ngo',
                isVerified: true,
                ngoApplicationId: id,
                ngoId,
                ngoApprovedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }

          updateData = { status: 'approved', ngoId };
        } else if (action === 'reject') {
          batch.update(docRef, {
            status: 'rejected',
            rejectedAt: serverTimestamp(),
          });
          if (app?.userId) {
            batch.set(
              doc(db, 'users', app.userId),
              {
                role: 'supporter',
                isVerified: false,
                ngoApplicationId: id,
                ngoRejectedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
          updateData = { status: 'rejected' };
        }

        await batch.commit();
      } else if (tab === 'activeVolunteers' && action === 'revoke') {
        const batch = writeBatch(db);
        batch.update(docRef, updateData);

        const volunteerSnapshot = await getDocs(query(
          collection(db, 'volunteers'),
          where('userId', '==', id),
          where('status', '==', 'approved')
        ));

        volunteerSnapshot.docs.forEach(volunteerDoc => {
          batch.update(volunteerDoc.ref, {
            status: 'revoked',
            revokedAt: serverTimestamp()
          });
        });

        await batch.commit();
      } else {
        await updateDoc(docRef, updateData);
      }
      
      if (tab === 'sponsors') setSponsors(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
      else if (tab === 'volunteers') setVolunteers(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
      else if (tab === 'activeVolunteers') setActiveVolunteers(prev => prev.filter(i => i.id !== id));
      else if (tab === 'ngoRegister') setNgoRegisterApps(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
      
      setSelectedItem(null);
      setActiveKycImage(null);

    } catch (err) {
      console.error(err);
      alert('Failed to update record.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      const mockImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      await addDoc(collection(db, 'sponsors'), {
        name: 'Seed Test Corp',
        tid: 'SEED-12345',
        status: 'pending',
        receiptUrl: mockImg,
        type: 'corporate',
        budget: '50000'
      });
      await addDoc(collection(db, 'volunteers'), {
        name: 'Seed Volunteer',
        cnic: '42101-1111111-1',
        status: 'pending',
        cnicFront: mockImg,
        cnicBack: mockImg,
        selfie: mockImg,
        email: 'seed@test.com',
        phone: '03001234567',
        city: 'Karachi',
        interests: 'food_distribution',
        bio: 'Automated test seed data.'
      });
      alert("Mock testing data created! Please refresh.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDemoNgo = async () => {
    setIsLoading(true);
    try {
      const result = await seedDemoNgo();
      alert(result.message);
    } catch (err) {
      console.error(err);
      if (err instanceof DemoNgoSeedError) {
        alert(
          `${err.message}\n\nFirebase Console steps:\n${err.consoleSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        );
      } else {
        alert(err instanceof Error ? err.message : 'Failed to seed demo NGO.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openDonationReview = (donation: DonationRecord) => {
    setSelectedDonation(donation);
    setAdminNoteDraft(donation.adminNote || '');
  };

  const handleDonationStatusUpdate = async (status: DonationStatus) => {
    if (!selectedDonation) return;
    setDonationActionLoading(true);
    try {
      const batch = writeBatch(db);
      const donationRef = doc(db, 'donations', selectedDonation.id);
      batch.update(donationRef, {
        status,
        adminNote: adminNoteDraft.trim(),
        reviewedAt: serverTimestamp(),
      });

      // Keep NGO received totals in sync for money donations
      const wasApproved =
        selectedDonation.type === 'money' && selectedDonation.status === 'approved';
      const willApprove = selectedDonation.type === 'money' && status === 'approved';
      const amount =
        typeof selectedDonation.amount === 'number' ? selectedDonation.amount : 0;

      if (selectedDonation.ngoId && amount > 0) {
        const ngoRef = doc(db, 'Ngos', selectedDonation.ngoId);
        if (!wasApproved && willApprove) {
          batch.update(ngoRef, { received: increment(amount) });
        } else if (wasApproved && !willApprove) {
          batch.update(ngoRef, { received: increment(-amount) });
        }
      }

      await batch.commit();

      setSelectedDonation((prev) =>
        prev ? { ...prev, status, adminNote: adminNoteDraft.trim() } : null
      );
      alert(`Donation marked as ${formatDonationStatus(status)}. NGO Portal updates live.`);
    } catch (err) {
      console.error(err);
      alert('Failed to update donation status.');
    } finally {
      setDonationActionLoading(false);
    }
  };

  const handleSaveAdminNoteOnly = async () => {
    if (!selectedDonation) return;
    setDonationActionLoading(true);
    try {
      await updateDoc(doc(db, 'donations', selectedDonation.id), {
        adminNote: adminNoteDraft.trim(),
        reviewedAt: serverTimestamp(),
      });
      setSelectedDonation((prev) =>
        prev ? { ...prev, adminNote: adminNoteDraft.trim() } : null
      );
      alert('Admin note saved. Visible on NGO Portal.');
    } catch (err) {
      console.error(err);
      alert('Failed to save admin note.');
    } finally {
      setDonationActionLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Icons.Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-xl border border-slate-100">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icons.Lock size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-500 mb-8 font-medium">You do not have administrative privileges.</p>
          <RouterLink to="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
            Return to Home
          </RouterLink>
        </div>
      </div>
    );
  }

  const navigateTo = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  /** Dashboard cards always render; values appear once a section has been opened (no extra queries). */
  const overviewCards: {
    id: TabType;
    label: string;
    value: number | null;
    icon: typeof Icons.Building2;
    accent: string;
    hint?: string;
  }[] = [
    {
      id: 'activeNgos',
      label: 'Active NGOs',
      value: loadedSections.activeNgos ? activeNgos.length : null,
      icon: Icons.Building2,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'activeVolunteers',
      label: 'Active Volunteers',
      value: loadedSections.activeVolunteers ? activeVolunteers.length : null,
      icon: Icons.Users,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'ngoDonations',
      label: 'Donations',
      value: loadedSections.ngoDonations ? ngoDonations.length : null,
      icon: Icons.HandHeart,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      id: 'sponsors',
      label: 'Sponsors',
      value: loadedSections.sponsors ? sponsors.length : null,
      icon: Icons.Heart,
      accent: 'bg-pink-50 text-pink-600',
    },
    {
      id: 'volunteers',
      label: 'Volunteer Apps',
      value: loadedSections.volunteers
        ? volunteers.filter((v) => v.status === 'pending').length
        : null,
      icon: Icons.ClipboardCheck,
      accent: 'bg-teal-50 text-teal-600',
      hint: 'pending',
    },
    {
      id: 'ngoRegister',
      label: 'NGO Applications',
      value: loadedSections.ngoRegister
        ? ngoRegisterApps.filter((a) => a.status === 'pending').length
        : null,
      icon: Icons.ClipboardList,
      accent: 'bg-indigo-50 text-indigo-600',
      hint: 'pending',
    },
  ];

  const recentActivity = [
    ...sponsors
      .filter((s) => s.status === 'pending')
      .slice(0, 4)
      .map((s) => ({
        id: `s-${s.id}`,
        title: s.companyName || s.name,
        meta: 'Sponsor pending review',
        tab: 'sponsors' as TabType,
        icon: Icons.Heart,
      })),
    ...volunteers
      .filter((v) => v.status === 'pending')
      .slice(0, 4)
      .map((v) => ({
        id: `v-${v.id}`,
        title: v.name,
        meta: 'Volunteer KYC pending',
        tab: 'volunteers' as TabType,
        icon: Icons.Users,
      })),
    ...ngoRegisterApps
      .filter((a) => a.status === 'pending')
      .slice(0, 4)
      .map((a) => ({
        id: `n-${a.id}`,
        title: a.name,
        meta: 'NGO application pending',
        tab: 'ngoRegister' as TabType,
        icon: Icons.Building2,
      })),
    ...ngoDonations.slice(0, 4).map((d) => ({
      id: `d-${d.id}`,
      title: d.ngoName || d.donorName || 'Donation',
      meta: `${formatDonationStatus(d.status)} · ${d.type}`,
      tab: 'ngoDonations' as TabType,
      icon: Icons.HandHeart,
    })),
  ].slice(0, 8);

  const sectionMeta =
    activeTab !== 'dashboard' ? SECTION_META[activeTab] : null;
  const SectionIcon =
    sectionMeta ? (Icons[sectionMeta.icon] as typeof Icons.Newspaper) : Icons.LayoutDashboard;

  const navButtonClass = (tab: TabType) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      activeTab === tab
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const SidebarNav = () => (
    <nav className="flex flex-col gap-5 px-3 pb-6">
      <div>
        <button type="button" onClick={() => navigateTo('dashboard')} className={navButtonClass('dashboard')}>
          <Icons.LayoutDashboard size={18} />
          Dashboard
        </button>
      </div>

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Content</p>
        <div className="space-y-0.5">
          <button type="button" onClick={() => navigateTo('managePosts')} className={navButtonClass('managePosts')}>
            <Icons.Newspaper size={18} />
            Posts
          </button>
        </div>
      </div>

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Community</p>
        <div className="space-y-0.5">
          <button type="button" onClick={() => navigateTo('sponsors')} className={navButtonClass('sponsors')}>
            <Icons.Heart size={18} />
            Sponsors
          </button>
          <button type="button" onClick={() => navigateTo('volunteers')} className={navButtonClass('volunteers')}>
            <Icons.Users size={18} />
            Volunteers
          </button>
          <button type="button" onClick={() => navigateTo('activeVolunteers')} className={navButtonClass('activeVolunteers')}>
            <Icons.UserCheck size={18} />
            Active Volunteers
          </button>
        </div>
      </div>

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">NGOs</p>
        <div className="space-y-0.5">
          <button type="button" onClick={() => navigateTo('ngoRegister')} className={navButtonClass('ngoRegister')}>
            <Icons.ClipboardList size={18} />
            Applications
          </button>
          <button type="button" onClick={() => navigateTo('activeNgos')} className={navButtonClass('activeNgos')}>
            <Icons.Building2 size={18} />
            Active NGOs
          </button>
        </div>
      </div>

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Finance</p>
        <div className="space-y-0.5">
          <button type="button" onClick={() => navigateTo('ngoDonations')} className={navButtonClass('ngoDonations')}>
            <Icons.HandHeart size={18} />
            Donations
          </button>
        </div>
      </div>
    </nav>
  );

  const SidebarBrand = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
        <Icons.ShieldCheck size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900 truncate">FreeHunger</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Admin Console</p>
      </div>
      {showClose && (
        <button
          type="button"
          className="ml-auto w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <Icons.X size={16} />
        </button>
      )}
    </div>
  );

  return (
    /* Contained app shell: fills space under navbar, never fixed over the site footer */
    <div className="bg-slate-50 font-sans text-slate-900 pt-16">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile off-canvas drawer only (overlay; does not affect page layout) */}
      <aside
        className={`lg:hidden fixed z-50 top-16 bottom-0 left-0 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!sidebarOpen}
      >
        <SidebarBrand showClose />
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav />
        </div>
      </aside>

      {/* In-flow dashboard shell — sidebar + content; footer stays below this block */}
      <div className="flex min-h-[calc(100vh-4rem)] w-full">
        {/* Desktop sidebar: sticky within admin height only (never covers footer) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white sticky top-16 self-start h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
          <SidebarBrand />
          <div className="flex-1 overflow-y-auto py-3 min-h-0">
            <SidebarNav />
          </div>
          <div className="shrink-0 border-t border-slate-100 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Signed in as</p>
            <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
              {profile?.displayName || profile?.email || 'Admin'}
            </p>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shrink-0">
            <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <Icons.Menu size={18} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 truncate">
                      {activeTab === 'dashboard' ? 'Dashboard' : sectionMeta?.label || 'Admin'}
                    </h1>
                    {activeTab !== 'dashboard' && (
                      <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                    {activeTab === 'dashboard'
                      ? 'Platform management overview'
                      : sectionMeta?.description || 'Platform Management Dashboard'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {profile && (
                  <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                      {(profile.displayName || profile.email || 'A')
                        .split(' ')
                        .filter(Boolean)
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                        {profile.displayName || 'Admin'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                )}
                <RouterLink
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                >
                  <Icons.Home size={14} />
                  <span className="hidden sm:inline">Site</span>
                </RouterLink>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-10 max-w-[1400px] w-full mx-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600">
              <Icons.AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {activeTab === 'dashboard' ? (
            <div className="space-y-6 lg:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Overview</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1 max-w-xl">
                    Jump into any area of the platform. Counts fill in after you open a section — no extra database load on the dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('managePosts')}
                  className="inline-flex items-center gap-2 self-start sm:self-auto bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all"
                >
                  <Icons.Plus size={16} /> New post
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {overviewCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => navigateTo(card.id)}
                    className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all p-5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.accent}`}>
                        <card.icon size={20} />
                      </div>
                      <Icons.ArrowUpRight
                        size={16}
                        className="text-slate-300 group-hover:text-emerald-500 transition-colors"
                      />
                    </div>
                    <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                      {card.value === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        card.value
                      )}
                    </p>
                    <p className="text-sm font-semibold text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>{card.label}</span>
                      {card.hint ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {card.hint}
                        </span>
                      ) : null}
                    </p>
                    {card.value === null && (
                      <p className="text-[11px] text-slate-400 font-medium mt-2">
                        Open section to load count
                      </p>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                  <h3 className="text-sm font-black text-slate-900 mb-1">Quick Actions</h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">Common admin workflows</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('managePosts')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
                    >
                      <Icons.Plus size={16} /> Create Post
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('ngoRegister')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 border border-slate-100 transition-all"
                    >
                      <Icons.ClipboardCheck size={16} className="text-indigo-500" /> Review NGOs
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('volunteers')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 border border-slate-100 transition-all"
                    >
                      <Icons.UserCheck size={16} className="text-emerald-500" /> Review Volunteers
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('ngoDonations')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 border border-slate-100 transition-all"
                    >
                      <Icons.HandHeart size={16} className="text-rose-500" /> Review Donations
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('sponsors')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 border border-slate-100 transition-all"
                    >
                      <Icons.Heart size={16} className="text-pink-500" /> Review Sponsors
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">From sections you have opened</p>
                    </div>
                    {recentActivity.length > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                        Live cache
                      </span>
                    )}
                  </div>
                  {recentActivity.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {recentActivity.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => navigateTo(item.tab)}
                            className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                              <item.icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                              <p className="text-xs text-slate-500 font-medium truncate">{item.meta}</p>
                            </div>
                            <Icons.ChevronRight size={16} className="text-slate-300 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Icons.Activity size={22} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No activity yet</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Open Volunteers, NGO Applications, Sponsors, or Donations once — pending items will show up here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[min(500px,60vh)]">
          {activeTab === 'managePosts' ? (
            <div className="p-1 sm:p-2">
              <AdminManagePosts />
            </div>
          ) : (
          <>
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <SectionIcon size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-900 tracking-tight">
                  {sectionMeta?.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {sectionMeta?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSeedDemoNgo}
                className="bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-violet-100 transition-all flex items-center gap-1.5"
              >
                <Icons.Building2 size={14} /> Seed Demo NGO
              </button>
              <button onClick={handleSeedData} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                <Icons.Zap size={14} /> Seed Data
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'sponsors' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Sponsor</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sponsors.length === 0 && !isLoading && <EmptyRow colSpan={3} message="No sponsorship data." />}
                  {sponsors.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          {s.companyName || s.name}
                          {s.status === 'approved' && <Icons.CheckCircle2 size={14} className="text-emerald-500" />}
                          {s.status === 'rejected' && <Icons.XCircle size={14} className="text-rose-500" />}
                        </div>
                        <div className="text-[10px] font-black uppercase text-rose-500">{s.type}</div>
                      </td>
                      <td className="p-5 font-mono text-sm text-slate-500">{s.tid || s.transactionId || '—'}</td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {s.status === 'pending' && (
                            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-amber-100 text-amber-700">
                              pending
                            </span>
                          )}
                          {s.status !== 'pending' && (
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                              s.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {s.status}
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedItem({ data: s, type: 'sponsor' });
                              setActiveKycImage({
                                url: s.receiptUrl || s.adUrl || '',
                                title: s.receiptUrl ? 'Payment Receipt' : 'Ad Asset',
                              });
                            }}
                            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                          >
                            <Icons.Eye size={14} /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'volunteers' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Volunteer</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {volunteers.length === 0 && !isLoading && <EmptyRow colSpan={3} message="No volunteers found." />}
                  {volunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          {v.name}
                          {v.status === 'approved' && <Icons.CheckCircle2 size={14} className="text-emerald-500" />}
                          {v.status === 'rejected' && <Icons.XCircle size={14} className="text-rose-500" />}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-black uppercase">{v.city || 'N/A'}</div>
                      </td>
                      <td className="p-5 text-xs font-medium text-slate-500">
                        <div>{v.email}</div>
                        <div className="mt-1 font-mono text-slate-400">{v.phone}</div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {v.status !== 'pending' && (
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                              v.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {v.status}
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedItem({ data: v, type: 'volunteer' });
                              setActiveKycImage({ url: v.cnicFront || '', title: 'CNIC Front' });
                            }}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-2"
                          >
                            <Icons.UserCheck size={14} /> {v.status === 'pending' ? 'Verify KYC' : 'Review'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'activeVolunteers' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Volunteer</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeVolunteers.length === 0 && !isLoading && <EmptyRow colSpan={4} message="No active volunteers." />}
                  {activeVolunteers.map((v) => {
                    const volunteerName = v.displayName || v.name || 'Unnamed Volunteer';
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                              {volunteerName.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'V'}
                            </div>
                            <div>
                              <div>{volunteerName}</div>
                              <div className="text-[10px] text-emerald-500 font-black uppercase">{v.city || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-xs font-medium text-slate-500">
                          <div>{v.email || 'N/A'}</div>
                          <div className="mt-1 font-mono text-slate-400">{v.phone || v.id}</div>
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-emerald-100 text-emerald-600">
                            Posting enabled
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => {
                              const confirmed = window.confirm(`Remove volunteer posting permissions for ${volunteerName}?`);
                              if (confirmed) handleAction('activeVolunteers', v.id, 'revoke');
                            }}
                            className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all inline-flex items-center gap-2"
                          >
                            <Icons.UserMinus size={14} /> Remove Perms
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'ngoDonations' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">NGO</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Donor</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Type / Amount</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ngoDonations.length === 0 && !isLoading && (
                    <EmptyRow colSpan={5} message="No NGO donations yet." />
                  )}
                  {ngoDonations.map((d) => {
                    const date = donationTimestampToDate(d.timestamp);
                    const detail =
                      d.type === 'money'
                        ? `Rs. ${(d.amount || 0).toLocaleString()}`
                        : d.items || d.quantity || d.type;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <div className="font-bold text-slate-700">{d.ngoName || d.ngoId}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {date
                              ? date.toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Just now'}
                            {d.source ? ` · ${d.source}` : ''}
                          </div>
                        </td>
                        <td className="p-5 font-medium text-slate-600 text-sm">
                          {d.donorName || 'Anonymous'}
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 text-slate-600 mr-2">
                            {d.type}
                          </span>
                          <span className="font-black text-emerald-600 text-sm">{detail}</span>
                        </td>
                        <td className="p-5">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusBadgeClasses(
                              d.status
                            )}`}
                          >
                            {formatDonationStatus(d.status)}
                          </span>
                          {d.adminNote && (
                            <p className="text-[10px] text-slate-400 mt-1.5 max-w-[180px] truncate">
                              Note: {d.adminNote}
                            </p>
                          )}
                        </td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => openDonationReview(d)}
                            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all inline-flex items-center gap-2"
                          >
                            <Icons.Eye size={14} /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'ngoRegister' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">NGO</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Registration</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ngoRegisterApps.length === 0 && !isLoading && (
                    <EmptyRow colSpan={4} message="No NGO registration applications." />
                  )}
                  {ngoRegisterApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          {app.name}
                          {app.status === 'approved' && <Icons.CheckCircle2 size={14} className="text-emerald-500" />}
                          {app.status === 'rejected' && <Icons.XCircle size={14} className="text-rose-500" />}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-black uppercase">{app.city || 'N/A'}</div>
                      </td>
                      <td className="p-5 text-xs font-medium text-slate-500">
                        <div>{app.contactName || '—'}</div>
                        <div className="mt-1">{app.email}</div>
                        <div className="mt-1 font-mono text-slate-400">{app.phone}</div>
                      </td>
                      <td className="p-5 text-xs font-medium text-slate-500">
                        <div className="font-mono">{app.registrationNumber || '—'}</div>
                        <div className="text-[10px] uppercase font-black text-slate-400 mt-1">
                          {app.registrationType || '—'} · {app.yearEstablished || '—'}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {app.status !== 'pending' && (
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                              app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {app.status}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedItem({ data: app, type: 'ngoRegister' });
                              setActiveKycImage({
                                url: app.registrationCert || '',
                                title: 'Registration Cert',
                              });
                            }}
                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                          >
                            <Icons.ClipboardCheck size={14} /> {app.status === 'pending' ? 'Review' : 'View'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'activeNgos' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">NGO Profile</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Methods</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeNgos.length === 0 && !isLoading && (
                    <EmptyRow colSpan={4} message="No active NGOs with portal access." />
                  )}
                  {activeNgos.map((ngo) => (
                    <tr key={ngo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center overflow-hidden shrink-0">
                            {ngo.logoUrl ? (
                              <img src={ngo.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Icons.Building2 size={18} />
                            )}
                          </div>
                          <div>
                            <div>{ngo.name || 'Unnamed NGO'}</div>
                            <div className="text-[10px] text-amber-600 font-black uppercase">
                              {ngo.city || 'N/A'} · {ngo.id}
                            </div>
                            {ngo.description && (
                              <p className="text-[11px] text-slate-400 font-medium mt-1 max-w-xs truncate">
                                {ngo.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-xs font-medium text-slate-500">
                        <div>{ngo.contact || '—'}</div>
                        <div className="mt-1 font-mono text-slate-400">{ngo.phone || '—'}</div>
                        {ngo.address && (
                          <div className="mt-1 text-slate-400 max-w-[160px] truncate">{ngo.address}</div>
                        )}
                      </td>
                      <td className="p-5 text-[11px] text-slate-500 space-y-1">
                        {ngo.bankDetails && (
                          <div className="flex items-start gap-1.5">
                            <Icons.Landmark size={12} className="mt-0.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-2 whitespace-pre-line">{ngo.bankDetails}</span>
                          </div>
                        )}
                        {ngo.easypaisa && (
                          <div className="font-mono">EP: {ngo.easypaisa}</div>
                        )}
                        {ngo.jazzcash && (
                          <div className="font-mono">JC: {ngo.jazzcash}</div>
                        )}
                        {!ngo.bankDetails && !ngo.easypaisa && !ngo.jazzcash && (
                          <span className="text-slate-400">No payment methods set</span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-emerald-100 text-emerald-600">
                            Portal enabled
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Rs. {(ngo.received || 0).toLocaleString()}
                            {ngo.goal ? ` / ${ngo.goal.toLocaleString()}` : ''}
                          </span>
                          {ngo.ownerUid && (
                            <span className="text-[9px] text-slate-400 font-mono max-w-[120px] truncate" title={ngo.ownerUid}>
                              owner: {ngo.ownerUid.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <Icons.Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          )}
          </>
          )}
        </div>
          )}
          </div>
        </div>
      </div>

      {/* NGO Donation review modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-zoom-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold bg-emerald-100 text-emerald-600">
                  <Icons.HandHeart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {selectedDonation.ngoName || 'NGO Donation'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    Review · Updates NGO Portal live
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDonation(null)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
              >
                <Icons.XCircle size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoBox icon={Icons.User} label="Donor" value={selectedDonation.donorName} />
                <InfoBox icon={Icons.Building2} label="NGO" value={selectedDonation.ngoName} />
                <InfoBox
                  icon={Icons.Package}
                  label="Type"
                  value={selectedDonation.type}
                />
                <InfoBox
                  icon={Icons.Coins}
                  label="Amount / Items"
                  value={
                    selectedDonation.type === 'money'
                      ? `Rs. ${(selectedDonation.amount || 0).toLocaleString()}`
                      : selectedDonation.items || selectedDonation.quantity || '—'
                  }
                />
                <InfoBox
                  icon={Icons.Tag}
                  label="Source"
                  value={selectedDonation.source}
                />
                <InfoBox
                  icon={Icons.BadgeCheck}
                  label="Current Status"
                  value={formatDonationStatus(selectedDonation.status)}
                />
                {selectedDonation.paymentMethod && (
                  <InfoBox
                    icon={Icons.Wallet}
                    label="Payment Method"
                    value={selectedDonation.paymentMethod}
                  />
                )}
                {selectedDonation.transactionId && (
                  <InfoBox
                    icon={Icons.Hash}
                    label="Transaction ID"
                    value={selectedDonation.transactionId}
                    isMono
                  />
                )}
              </div>

              {selectedDonation.receiptUrl && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Receipt
                  </p>
                  <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 p-4 max-h-48 flex items-center justify-center">
                    <img
                      src={selectedDonation.receiptUrl}
                      alt="Receipt"
                      className="max-h-40 object-contain"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Admin Note (visible on NGO Portal)
                </label>
                <textarea
                  rows={3}
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  placeholder="Write a custom note for this donation..."
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium resize-y"
                />
                <button
                  type="button"
                  disabled={donationActionLoading}
                  onClick={handleSaveAdminNoteOnly}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  Save note only
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={donationActionLoading}
                  onClick={() => handleDonationStatusUpdate('approved')}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icons.CheckCircle2 size={18} /> Approve
                </button>
                <button
                  type="button"
                  disabled={donationActionLoading}
                  onClick={() => handleDonationStatusUpdate('rejected')}
                  className="w-full bg-white text-rose-500 border-2 border-rose-100 py-3 rounded-xl font-black text-sm hover:bg-rose-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icons.XCircle size={18} /> Reject
                </button>
                <button
                  type="button"
                  disabled={donationActionLoading}
                  onClick={() => handleDonationStatusUpdate('refunded')}
                  className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icons.RotateCcw size={18} /> Refund
                </button>
                <button
                  type="button"
                  disabled={donationActionLoading}
                  onClick={() => handleDonationStatusUpdate('action_required')}
                  className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-3 rounded-xl font-black text-sm hover:bg-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icons.AlertTriangle size={18} /> Action Required
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] max-w-6xl w-full h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                  selectedItem.type === 'volunteer'
                    ? 'bg-emerald-100 text-emerald-600'
                    : selectedItem.type === 'ngoRegister'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-rose-100 text-rose-600'
                }`}>
                  {selectedItem.type === 'volunteer' ? (
                    <Icons.UserCheck size={24} />
                  ) : selectedItem.type === 'ngoRegister' ? (
                    <Icons.Building2 size={24} />
                  ) : (
                    <Icons.Heart size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedItem.data.name || selectedItem.data.companyName}</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    {selectedItem.type === 'volunteer'
                      ? 'Volunteer KYC Hub'
                      : selectedItem.type === 'ngoRegister'
                        ? 'NGO Registration Review'
                        : 'Sponsor Verification'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setSelectedItem(null); setActiveKycImage(null); }} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><Icons.XCircle size={20}/></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-80 bg-slate-50 p-8 border-r border-slate-100 overflow-y-auto">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Submission Details</h4>
                  <div className="space-y-4">
                    {selectedItem.type === 'volunteer' ? (
                      <>
                        <InfoBox icon={Icons.Mail} label="Email" value={selectedItem.data.email} />
                        <InfoBox icon={Icons.Phone} label="Phone" value={selectedItem.data.phone} />
                        <InfoBox icon={Icons.MapPin} label="City" value={selectedItem.data.city} />
                        <InfoBox icon={Icons.CreditCard} label="CNIC" value={selectedItem.data.cnic} isMono />
                      </>
                    ) : selectedItem.type === 'ngoRegister' ? (
                      <>
                        <InfoBox icon={Icons.User} label="Contact" value={selectedItem.data.contactName} />
                        <InfoBox icon={Icons.Mail} label="Email" value={selectedItem.data.email} />
                        <InfoBox icon={Icons.Phone} label="Phone" value={selectedItem.data.phone} />
                        <InfoBox icon={Icons.MapPin} label="City" value={selectedItem.data.city} />
                        <InfoBox icon={Icons.FileText} label="Reg. No" value={selectedItem.data.registrationNumber} isMono />
                        <InfoBox icon={Icons.Landmark} label="Bank" value={selectedItem.data.bankDetails} />
                        <InfoBox icon={Icons.Wallet} label="EasyPaisa" value={selectedItem.data.easypaisa} isMono />
                        <InfoBox icon={Icons.Wallet} label="JazzCash" value={selectedItem.data.jazzcash} isMono />
                      </>
                    ) : (
                      <>
                        <InfoBox icon={Icons.Mail} label="Email" value={selectedItem.data.email} />
                        {selectedItem.data.contactName && (
                          <InfoBox icon={Icons.User} label="Contact" value={selectedItem.data.contactName} />
                        )}
                        <InfoBox
                          icon={Icons.Zap}
                          label="TID"
                          value={selectedItem.data.tid || selectedItem.data.transactionId}
                          isMono
                        />
                        <InfoBox
                          icon={Icons.Package}
                          label="Budget"
                          value={`${selectedItem.data.budget || selectedItem.data.amount || '—'} PKR`}
                        />
                        {selectedItem.data.package && (
                          <InfoBox icon={Icons.Package} label="Package" value={selectedItem.data.package} />
                        )}
                        {selectedItem.data.paymentMethod && (
                          <InfoBox icon={Icons.Wallet} label="Payment" value={selectedItem.data.paymentMethod} />
                        )}
                        {selectedItem.data.adUrl && (
                          <a href={selectedItem.data.adUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-600 text-xs font-bold">
                            <Icons.Video size={16}/> View Ad Asset <Icons.ExternalLink size={14}/>
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-8 space-y-3">
                    <button
                      onClick={() =>
                        handleAction(
                          selectedItem.type === 'volunteer'
                            ? 'volunteers'
                            : selectedItem.type === 'ngoRegister'
                              ? 'ngoRegister'
                              : 'sponsors',
                          selectedItem.data.id,
                          'approve'
                        )
                      }
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      <Icons.CheckCircle2 size={18}/> Approve
                    </button>
                    <button
                      onClick={() =>
                        handleAction(
                          selectedItem.type === 'volunteer'
                            ? 'volunteers'
                            : selectedItem.type === 'ngoRegister'
                              ? 'ngoRegister'
                              : 'sponsors',
                          selectedItem.data.id,
                          'reject'
                        )
                      }
                      className="w-full bg-white text-rose-500 border-2 border-rose-100 py-3 rounded-xl font-black text-sm hover:bg-rose-50 flex items-center justify-center gap-2"
                    >
                      <Icons.XCircle size={18}/> Reject
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-8 flex flex-col gap-6 overflow-hidden">
                {selectedItem.type === 'volunteer' && (
                  <div className="flex gap-2">
                    {[{ label: 'CNIC Front', url: selectedItem.data.cnicFront }, { label: 'CNIC Back', url: selectedItem.data.cnicBack }, { label: 'Selfie', url: selectedItem.data.selfie }].map((img, i) => (
                      <button key={i} onClick={() => { setActiveKycImage({ url: img.url || '', title: img.label }); setZoomLevel(1); }} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeKycImage?.title === img.label ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                        {img.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedItem.type === 'ngoRegister' && (
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Registration Cert', url: selectedItem.data.registrationCert },
                      { label: 'Tax Cert', url: selectedItem.data.taxCert },
                      { label: 'Auth Letter', url: selectedItem.data.authorizationLetter },
                    ].map((img, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveKycImage({ url: img.url || '', title: img.label });
                          setZoomLevel(1);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          activeKycImage?.title === img.label
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 bg-white rounded-[2.5rem] border-8 border-white shadow-inner relative overflow-hidden flex items-center justify-center bg-slate-50 group">
                  <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-600"><Icons.Plus size={18}/></button>
                    <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-600"><Icons.Minus size={18}/></button>
                    <button onClick={() => setZoomLevel(1)} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-600"><Icons.Maximize2 size={18}/></button>
                  </div>
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    {activeKycImage?.url ? (
                      <img src={activeKycImage.url} alt="Verification" className="max-w-full max-h-full object-contain transition-transform duration-300" style={{ transform: `scale(${zoomLevel})` }} />
                    ) : (
                      <p className="text-slate-400 text-sm font-bold">No document selected</p>
                    )}
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur px-6 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                    {activeKycImage?.title || 'Document View'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, isMono }: { icon: any, label: string, value?: string, isMono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shrink-0"><Icon size={18}/></div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-xs font-bold text-slate-700 ${isMono ? 'font-mono' : ''}`}>{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number, message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center">
            <Icons.Package size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-400">{message}</p>
        </div>
      </td>
    </tr>
  );
}
