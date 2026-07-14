import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, writeBatch, serverTimestamp, query, where } from 'firebase/firestore';
import * as Icons from 'lucide-react';
import { useUserRole } from '../lib/useUserRole';
import { Link as RouterLink } from 'react-router-dom';

// --- Interfaces ---

export interface Sponsor {
  id: string;
  name: string;
  tid: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl: string;
  adUrl?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  type?: 'corporate' | 'individual';
  budget?: string;
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

export interface ViewToHelpItem {
  id: string;
  name: string;
  adsWatched: number;
  fundsGenerated: string;
  walletVerified: boolean;
}

export interface LogisticsItem {
  id: string;
  vehicle: string;
  eta: string;
  inDriveLink: string;
  delivered: boolean;
}

type TabType = 'sponsors' | 'volunteers' | 'activeVolunteers' | 'viewToHelp' | 'logistics';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabType>('sponsors');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<{ data: any; type: 'volunteer' | 'sponsor' } | null>(null);
  const [activeKycImage, setActiveKycImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activeVolunteers, setActiveVolunteers] = useState<ActiveVolunteer[]>([]);
  const [viewToHelp, setViewToHelp] = useState<ViewToHelpItem[]>([]);
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const collectionName = activeTab === 'activeVolunteers' ? 'users' : activeTab;
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
        else if (activeTab === 'viewToHelp') setViewToHelp(data as ViewToHelpItem[]);
        else if (activeTab === 'logistics') setLogistics(data as LogisticsItem[]);
      } catch (err: any) {
        console.error(`Error fetching ${activeTab}:`, err);
        setError(`Could not load ${activeTab} data.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, profile]);

  const handleAction = async (tab: TabType, id: string, action: string) => {
    setIsLoading(true);
    try {
      const collectionName = tab === 'activeVolunteers' ? 'users' : tab;
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
      else if (action === 'verify') updateData = { walletVerified: true };
      else if (action === 'deliver') updateData = { delivered: true };

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
      else if (tab === 'viewToHelp') setViewToHelp(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
      else if (tab === 'logistics') setLogistics(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
      
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
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
            {[
              { id: 'sponsors', icon: Icons.Heart, label: 'Sponsors' },
              { id: 'volunteers', icon: Icons.Users, label: 'Volunteers' },
              { id: 'activeVolunteers', icon: Icons.UserMinus, label: 'Active' },
              { id: 'viewToHelp', icon: Icons.BarChart3, label: 'View to Help' },
              { id: 'logistics', icon: Icons.Truck, label: 'Logistics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
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
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
              {activeTab === 'sponsors' && <Icons.Heart size={16} className="text-rose-500"/>}
              {activeTab === 'volunteers' && <Icons.Users size={16} className="text-emerald-500"/>}
              {activeTab === 'activeVolunteers' && <Icons.UserMinus size={16} className="text-teal-500"/>}
              {activeTab === 'viewToHelp' && <Icons.BarChart3 size={16} className="text-indigo-500"/>}
              {activeTab === 'logistics' && <Icons.Truck size={16} className="text-amber-500"/>}
              {activeTab === 'activeVolunteers' ? 'ACTIVE VOLUNTEERS' : `${activeTab.toUpperCase()} Records`}
            </h3>
            <div className="flex items-center gap-4">
              <button onClick={handleSeedData} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                <Icons.Zap size={14} /> Seed Data
              </button>
              <div className="relative group">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input type="text" placeholder="Search..." className="bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-xl py-2 pl-10 pr-4 text-xs font-medium w-64 transition-all" />
              </div>
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
                      <td className="p-5 font-mono text-sm text-slate-500">{s.tid}</td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-3">
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
                              setActiveKycImage({ url: s.receiptUrl, title: 'Payment Receipt' });
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

            {activeTab === 'viewToHelp' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Ads Watched</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewToHelp.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">{item.name}</td>
                      <td className="p-5 text-sm font-bold text-slate-500">{item.adsWatched}</td>
                      <td className="p-5 text-right">
                        {item.walletVerified ? <span className="text-emerald-600 font-bold text-xs">Verified</span> : 
                        <button onClick={() => handleAction('viewToHelp', item.id, 'verify')} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Verify</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'logistics' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logistics.length === 0 && !isLoading && <EmptyRow colSpan={3} message="No active deliveries." />}
                  {logistics.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700">{l.vehicle} <div className="text-[10px] text-slate-400 font-medium">ETA: {l.eta}</div></td>
                      <td className="p-5">
                        <a href={l.inDriveLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                          <Icons.Link size={14}/> Open Map
                        </a>
                      </td>
                      <td className="p-5 text-right">
                        {!l.delivered ? (
                          <button onClick={() => handleAction('logistics', l.id, 'deliver')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ml-auto">
                            Mark Delivered <Icons.ArrowRight size={14}/>
                          </button>
                        ) : <span className="text-emerald-600 font-bold text-xs flex items-center justify-end gap-1"><Icons.CheckCircle2 size={14}/> Delivered</span>}
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
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] max-w-6xl w-full h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${selectedItem.type === 'volunteer' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {selectedItem.type === 'volunteer' ? <Icons.UserCheck size={24}/> : <Icons.Heart size={24}/>}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedItem.data.name || selectedItem.data.companyName}</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{selectedItem.type === 'volunteer' ? 'Volunteer KYC Hub' : 'Sponsor Verification'}</p>
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
                    ) : (
                      <>
                        <InfoBox icon={Icons.Mail} label="Email" value={selectedItem.data.email} />
                        <InfoBox icon={Icons.Zap} label="TID" value={selectedItem.data.tid} isMono />
                        <InfoBox icon={Icons.Package} label="Budget" value={`${selectedItem.data.budget} PKR`} />
                        {selectedItem.data.adUrl && (
                          <a href={selectedItem.data.adUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-600 text-xs font-bold">
                            <Icons.Video size={16}/> View Ad Asset <Icons.ExternalLink size={14}/>
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-8 space-y-3">
                    <button onClick={() => handleAction(selectedItem.type === 'volunteer' ? 'volunteers' : 'sponsors', selectedItem.data.id, 'approve')} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                      <Icons.CheckCircle2 size={18}/> Approve
                    </button>
                    <button onClick={() => handleAction(selectedItem.type === 'volunteer' ? 'volunteers' : 'sponsors', selectedItem.data.id, 'reject')} className="w-full bg-white text-rose-500 border-2 border-rose-100 py-3 rounded-xl font-black text-sm hover:bg-rose-50 flex items-center justify-center gap-2">
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

                <div className="flex-1 bg-white rounded-[2.5rem] border-8 border-white shadow-inner relative overflow-hidden flex items-center justify-center bg-slate-50 group">
                  <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-600"><Icons.Plus size={18}/></button>
                    <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-600"><Icons.Minus size={18}/></button>
                    <button onClick={() => setZoomLevel(1)} className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-600"><Icons.Maximize2 size={18}/></button>
                  </div>
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <img src={activeKycImage?.url} alt="Verification" className="max-w-full max-h-full object-contain transition-transform duration-300" style={{ transform: `scale(${zoomLevel})` }} />
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur px-6 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                    {activeKycImage?.title || 'Receipt View'}
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
