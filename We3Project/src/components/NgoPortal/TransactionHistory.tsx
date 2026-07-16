import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Loader2, MessageSquareText } from 'lucide-react';
import { useNgoPortal } from '../../lib/useNgoPortal';
import {
  type DonationRecord,
  type DonationStatus,
  type DonationType,
  donationTimestampToDate,
  formatDonationStatus,
  statusBadgeClasses,
} from '../../lib/donations';
import {
  NgoAccessDenied,
  NgoNotLinked,
  NgoPortalLoading,
} from './NgoPortalGuards';

type TypeFilter = 'all' | DonationType;
type StatusFilter = 'all' | DonationStatus;

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'money', label: 'Money' },
  { id: 'food', label: 'Food' },
  { id: 'clothes', label: 'Clothes' },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'action_required', label: 'Action Required' },
];

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { profile, authLoading, ngo, donations, donationsLoading, loading } =
    useNgoPortal({ donationLimit: 500 });

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) navigate('/login');
  }, [authLoading, profile, navigate]);

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [donations, typeFilter, statusFilter]);

  if (loading) return <NgoPortalLoading />;
  if (profile?.role !== 'ngo') return <NgoAccessDenied />;
  if (!ngo) return <NgoNotLinked />;

  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              NGO Portal · {ngo.name || 'Your NGO'}
            </p>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <History className="text-emerald-500" size={28} />
              Transaction History
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Complete donation history — money, food, and clothes.
            </p>
          </div>
          <RouterLink
            to="/ngo-portal"
            className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </RouterLink>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[2rem] p-5 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  typeFilter === f.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} of {donations.length} donations
          </p>
        </div>

        {/* Table / list */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {donationsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-16 px-6">
              No donations match the selected filters.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Donor
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Amount / Items
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Admin Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <HistoryTableRow key={d.id} donation={d} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filtered.map((d) => (
                  <HistoryMobileCard key={d.id} donation={d} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function typeLabel(type: DonationType | string): string {
  if (type === 'money') return 'Money';
  if (type === 'food') return 'Food';
  if (type === 'clothes') return 'Clothes';
  return type;
}

function typeBadgeClasses(type: DonationType | string): string {
  if (type === 'money') return 'bg-emerald-100 text-emerald-700';
  if (type === 'food') return 'bg-orange-100 text-orange-700';
  if (type === 'clothes') return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-slate-600';
}

function formatAmountOrItems(d: DonationRecord): string {
  if (d.type === 'money') {
    return `Rs. ${(d.amount || 0).toLocaleString()}`;
  }
  return d.items || d.quantity || typeLabel(d.type);
}

function formatDate(timestamp: any): string {
  const date = donationTimestampToDate(timestamp);
  if (!date) return 'Just now';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function HistoryTableRow({ donation }: { donation: DonationRecord }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="p-5">
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${typeBadgeClasses(
            donation.type
          )}`}
        >
          {typeLabel(donation.type)}
        </span>
      </td>
      <td className="p-5">
        <span className="font-bold text-slate-900 text-sm">
          {donation.donorName || 'Anonymous'}
        </span>
      </td>
      <td className="p-5">
        <span className="font-black text-emerald-600 text-sm">
          {formatAmountOrItems(donation)}
        </span>
      </td>
      <td className="p-5">
        <span className="text-sm font-medium text-slate-500">
          {formatDate(donation.timestamp)}
        </span>
      </td>
      <td className="p-5">
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusBadgeClasses(
            donation.status
          )}`}
        >
          {formatDonationStatus(donation.status)}
        </span>
      </td>
      <td className="p-5 max-w-xs">
        {donation.adminNote ? (
          <span className="text-sm text-slate-600 font-medium flex items-start gap-1.5">
            <MessageSquareText size={14} className="text-slate-400 mt-0.5 shrink-0" />
            {donation.adminNote}
          </span>
        ) : (
          <span className="text-xs text-slate-300 font-medium">—</span>
        )}
      </td>
    </tr>
  );
}

function HistoryMobileCard({ donation }: { donation: DonationRecord }) {
  return (
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${typeBadgeClasses(
              donation.type
            )}`}
          >
            {typeLabel(donation.type)}
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusBadgeClasses(
              donation.status
            )}`}
          >
            {formatDonationStatus(donation.status)}
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {formatDate(donation.timestamp)}
        </span>
      </div>
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-bold text-slate-900 text-sm">
            {donation.donorName || 'Anonymous'}
          </p>
          {donation.adminNote && (
            <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1">
              <MessageSquareText size={12} className="text-slate-400 mt-0.5 shrink-0" />
              {donation.adminNote}
            </p>
          )}
        </div>
        <p className="font-black text-emerald-600 text-sm shrink-0">
          {formatAmountOrItems(donation)}
        </p>
      </div>
    </div>
  );
}

export default TransactionHistory;
