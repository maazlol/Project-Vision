import { Play, Clock, CheckCircle2 } from 'lucide-react';

interface WatchAndEarnProps {
  videosToday: number;
  isWatching: boolean;
  countdown: number;
  resetTimer: string;
  onWatch: () => void;
}

const WatchAndEarn = ({ videosToday, isWatching, countdown, resetTimer, onWatch }: WatchAndEarnProps) => {
  const bonuses = [
    { count: 3, reward: 30, color: 'emerald' },
    { count: 5, reward: 50, color: 'orange' },
    { count: 10, reward: 150, color: 'rose' },
  ];

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Watch & Earn</h2>
          <p className="text-slate-500">Earn Rs. 10 per 30-second ad.</p>
        </div>
        {videosToday >= 10 && (
          <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Clock size={16} />
            Resets in: {resetTimer}
          </div>
        )}
      </div>

      <div className="relative rounded-3xl overflow-hidden aspect-video bg-slate-900 group">
        <img 
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
          alt="Ad" 
          className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
          {isWatching ? (
            <div className="text-7xl font-black">{countdown}</div>
          ) : (
            <>
              <button 
                onClick={onWatch}
                disabled={videosToday >= 10}
                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50 hover:scale-110 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Play size={32} fill="white" />
              </button>
              <p className="mt-6 font-bold text-xl">Watch this ad to earn Rs. 10</p>
              <p className="text-white/60 text-sm mt-2">Support child nutrition in rural Pakistan</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {bonuses.map((bonus) => (
          <div key={bonus.count} className={`p-4 rounded-2xl border-2 transition-all ${videosToday >= bonus.count ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Bonus</span>
              {videosToday >= bonus.count && <CheckCircle2 size={16} className="text-emerald-500" />}
            </div>
            <div className="font-bold text-slate-900 text-sm">Watch {bonus.count} Videos</div>
            <div className="text-emerald-600 font-black text-lg">+Rs. {bonus.reward}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchAndEarn;
