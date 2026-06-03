import { Trophy } from 'lucide-react';

interface LeaderboardProps {
  leaderboard: any[];
  currentUserUid?: string;
}

const Leaderboard = ({ leaderboard, currentUserUid }: LeaderboardProps) => {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-orange-500" />
        <h3 className="text-lg font-black text-slate-900">Top Helpers</h3>
      </div>
      <div className="space-y-4">
        {leaderboard.map((u, i) => (
          <div key={i} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${u.uid === currentUserUid ? 'bg-emerald-50 border-2 border-emerald-200' : 'hover:bg-slate-50'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">
                {u.username || u.name} {u.uid === currentUserUid && '(You)'}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.city || 'Pakistan'}</div>
            </div>
            <div className="text-emerald-600 font-black text-sm">Rs. {u.donatedThisMonth?.toLocaleString() || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
