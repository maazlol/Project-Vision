import { useEffect, useMemo, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  Coins,
  HandHeart,
  History,
  Loader2,
  Package,
  Shirt,
  Users,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { useNgoPortal } from '../../lib/useNgoPortal';
import {
  type DonationRecord,
  type DonationStatus,
  donationTimestampToDate,
  formatDonationStatus,
  isApprovedMoney,
  statusBadgeClasses,
} from '../../lib/donations';
import {
  NgoAccessDenied,
  NgoNotLinked,
  NgoPortalLoading,
} from './NgoPortalGuards';

const NgoDashboard = () => {
  const navigate = useNavigate();
  const { profile, authLoading, ngo, donations, donationsLoading, loading } = useNgoPortal({
    donationLimit: 50,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!profile) navigate('/login');
  }, [authLoading, profile, navigate]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalDonations = 0;
    let monthlyDonations = 0;
    let foodDonations = 0;
    let clothingDonations = 0;
    const donorKeys = new Set<string>();

    for (const d of donations) {
      const key = d.donorId || d.donorName?.toLowerCase().trim();
      if (key) donorKeys.add(key);

      if (d.type === 'food') foodDonations += 1;
      if (d.type === 'clothes') clothingDonations += 1;

      if (isApprovedMoney(d)) {
        totalDonations += d.amount || 0;
        const ts = donationTimestampToDate(d.timestamp);
        if (ts && ts >= monthStart) {
          monthlyDonations += d.amount || 0;
        }
      }
    }

    return {
      totalDonations,
      monthlyDonations,
      totalDonors: donorKeys.size,
      foodDonations,
      clothingDonations,
    };
  }, [donations]);

  const recentDonations = useMemo(() => donations.slice(0, 5), [donations]);

  if (loading) return <NgoPortalLoading />;
  if (profile?.role !== 'ngo') return <NgoAccessDenied />;
  if (!ngo) return <NgoNotLinked />;

  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Welcome */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-4 border-emerald-500 bg-emerald-50 flex items-center justify-center overflow-hidden">
                {ngo.logoUrl ? (
                  <img src={ngo.logoUrl} alt={ngo.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="text-emerald-600" size={28} />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  NGO Portal
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                  Welcome, {ngo.name || profile.displayName || 'NGO'}
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  {ngo.city || 'Pakistan'} · Live donation overview
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <RouterLink
                to="/ngo-portal/profile"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
              >
                <Settings size={18} />
                Edit Profile
              </RouterLink>
              <RouterLink
                to="/ngo-portal/history"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
              >
                <History size={18} />
                View Full History
              </RouterLink>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Coins size={22} />}
            label="Total Donations"
            value={`Rs. ${stats.totalDonations.toLocaleString()}`}
            tone="emerald"
          />
          <StatCard
            icon={<CalendarDays size={22} />}
            label="Monthly Donations"
            value={`Rs. ${stats.monthlyDonations.toLocaleString()}`}
            tone="blue"
          />
          <StatCard
            icon={<Users size={22} />}
            label="Total Donors"
            value={stats.totalDonors.toLocaleString()}
            tone="violet"
          />
          <StatCard
            icon={<Package size={22} />}
            label="Food Donations"
            value={stats.foodDonations.toLocaleString()}
            tone="orange"
          />
          <StatCard
            icon={<Shirt size={22} />}
            label="Clothing Donations"
            value={stats.clothingDonations.toLocaleString()}
            tone="rose"
          />
          <StatCard
            icon={<HandHeart size={22} />}
            label="All Records"
            value={donations.length.toLocaleString()}
            tone="slate"
          />
        </div>

        {/* Recent Donations */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <History className="text-emerald-500" />
              <h2 className="text-lg font-black text-slate-900">Recent Donations</h2>
            </div>
            <RouterLink
              to="/ngo-portal/history"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View Full History →
            </RouterLink>
          </div>

          {donationsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-emerald-600" size={28} />
            </div>
          ) : recentDonations.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              No donations yet. Credit gifts, individual payments, and in-kind requests will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentDonations.map((d) => (
                <RecentDonationRow key={d.id} donation={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'blue' | 'violet' | 'orange' | 'rose' | 'slate';
}) {
  const tones: Record<string, { box: string; icon: string; label: string; value: string }> = {
    emerald: {
      box: 'bg-emerald-50',
      icon: 'bg-emerald-500 shadow-emerald-200 text-white',
      label: 'text-emerald-700',
      value: 'text-emerald-600',
    },
    blue: {
      box: 'bg-blue-50',
      icon: 'bg-blue-500 shadow-blue-200 text-white',
      label: 'text-blue-700',
      value: 'text-blue-600',
    },
    violet: {
      box: 'bg-violet-50',
      icon: 'bg-violet-500 shadow-violet-200 text-white',
      label: 'text-violet-700',
      value: 'text-violet-600',
    },
    orange: {
      box: 'bg-orange-50',
      icon: 'bg-orange-500 shadow-orange-200 text-white',
      label: 'text-orange-700',
      value: 'text-orange-600',
    },
    rose: {
      box: 'bg-rose-50',
      icon: 'bg-rose-500 shadow-rose-200 text-white',
      label: 'text-rose-700',
      value: 'text-rose-600',
    },
    slate: {
      box: 'bg-slate-50',
      icon: 'bg-slate-700 shadow-slate-200 text-white',
      label: 'text-slate-600',
      value: 'text-slate-900',
    },
  };

  const t = tones[tone];

  return (
    <div className={`${t.box} rounded-2xl p-5 flex items-center gap-4 border border-white/60`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${t.icon}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${t.label}`}>{label}</p>
        <h3 className={`text-xl font-black ${t.value}`}>{value}</h3>
      </div>
    </div>
  );
}

function RecentDonationRow({ donation }: { donation: DonationRecord }) {
  const date = donationTimestampToDate(donation.timestamp);
  const dateLabel = date
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Just now';

  const typeLabel =
    donation.type === 'money' ? 'Money' : donation.type === 'food' ? 'Food' : 'Clothes';

  const detail =
    donation.type === 'money'
      ? `Rs. ${(donation.amount || 0).toLocaleString()}`
      : donation.items || donation.quantity || typeLabel;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-slate-900 text-sm truncate">
            {donation.donorName || 'Anonymous'}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-500">
            {typeLabel}
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${statusBadgeClasses(
              donation.status as DonationStatus
            )}`}
          >
            {formatDonationStatus(donation.status)}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {dateLabel}
          {donation.adminNote ? ` · Note: ${donation.adminNote}` : ''}
        </div>
      </div>
      <div className="text-emerald-600 font-black text-sm sm:text-base shrink-0">{detail}</div>
    </div>
  );
}

export default NgoDashboard;
