import { History } from 'lucide-react';

interface RecentDonationsProps {
  donations: any[];
}

const RecentDonations = ({ donations }: RecentDonationsProps) => {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <History className="text-emerald-500" />
        <h3 className="text-lg font-black text-slate-900">Recent Donations</h3>
      </div>
      <div className="space-y-4">
        {donations.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">No donations yet.</p>
        ) : (
          donations.map((d, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all">
              <div>
                <div className="font-bold text-slate-900 text-sm">{d.ngoName}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {d.timestamp?.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short' }) || 'Just now'}
                </div>
              </div>
              <div className="text-emerald-600 font-black">Rs. {d.amount}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentDonations;
