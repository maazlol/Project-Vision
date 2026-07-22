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
  | 'sponsors'
  | 'volunteers'
  | 'activeVolunteers'
  | 'ngoRegister'
  | 'activeNgos'
  | 'ngoDonations'
  | 'managePosts';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabType>('sponsors');
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
        setIsLoading(false);
      },
      () => {
        activeUnsub?.();
        activeUnsub = onSnapshot(
          collection(db, 'donations'),
          (snapshot) => {
            setNgoDonations(mapDocs(snapshot.docs));
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

  return (
    <div className="pt-24 pb-20 min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Icons.ShieldCheck size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-slate-500 font-medium">Oversee community operations.</p>
          </div>
          
          <div className="flex flex-wrap bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit gap-0.5">
            {[
              { id: 'sponsors', icon: Icons.Heart, label: 'Sponsors' },
              { id: 'volunteers', icon: Icons.Users, label: 'Volunteers' },
              { id: 'activeVolunteers', icon: Icons.UserMinus, label: 'Active' },
              { id: 'ngoDonations', icon: Icons.HandHeart, label: 'NGO Donations' },
              { id: 'ngoRegister', icon: Icons.ClipboardList, label: 'NGO Register' },
              { id: 'activeNgos', icon: Icons.Building2, label: 'Active NGOs' },
              { id: 'managePosts', icon: Icons.Newspaper, label: 'Manage Posts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 animate-fade-in">
            <Icons.AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative min-h-[500px]">
          {activeTab === 'managePosts' ? (
            <AdminManagePosts />
          ) : (
          <>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
              {activeTab === 'sponsors' && <Icons.Heart size={16} className="text-rose-500"/>}
              {activeTab === 'volunteers' && <Icons.Users size={16} className="text-emerald-500"/>}
              {activeTab === 'activeVolunteers' && <Icons.UserMinus size={16} className="text-teal-500"/>}
              {activeTab === 'ngoDonations' && <Icons.HandHeart size={16} className="text-emerald-500"/>}
              {activeTab === 'ngoRegister' && <Icons.ClipboardList size={16} className="text-indigo-500"/>}
              {activeTab === 'activeNgos' && <Icons.Building2 size={16} className="text-amber-500"/>}
              {activeTab === 'activeVolunteers'
                ? 'ACTIVE VOLUNTEERS'
                : activeTab === 'ngoDonations'
                  ? 'NGO DONATIONS'
                  : activeTab === 'ngoRegister'
                    ? 'NGO REGISTER APPLICATIONS'
                    : activeTab === 'activeNgos'
                      ? 'ACTIVE NGOS (PORTAL ACCESS)'
                      : `${activeTab.toUpperCase()} Records`}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
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
      <td colSpan={colSpan} className="p-20 text-center">
        <div className="flex flex-col items-center gap-3 opacity-20">
          <Icons.Package size={60} />
          <p className="text-sm font-black uppercase tracking-widest">{message}</p>
        </div>
      </td>
    </tr>
  );
}
