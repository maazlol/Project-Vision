import { MapPin, Heart } from 'lucide-react';

interface NgoCardProps {
  ngo: any;
  onDonateClick: (ngoId: string) => void;
}

const NgoCard = ({ ngo, onDonateClick }: NgoCardProps) => {
  const pct = Math.min(Math.round(((ngo.received || 0) / (ngo.goal || 500000)) * 100), 100);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-emerald-200 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${ngo.type === 'school' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
            {ngo.type === 'school' ? '🏫 School' : '🏢 NGO'}
          </span>
          {ngo.urgent && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-rose-100 text-rose-600">🆘 Urgent</span>}
        </div>
        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {ngo.verified ? 'Verified' : 'Demo'}
        </span>
      </div>
      <h4 className="text-lg font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{ngo.name}</h4>
      <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-4">
        <MapPin size={12} className="text-emerald-500" />
        {ngo.city || 'Pakistan'}
      </p>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-400">Received</span>
          <span className="text-slate-900">Rs. {(ngo.received || 0).toLocaleString()} / {(ngo.goal || 500000).toLocaleString()}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${pct < 30 ? 'bg-rose-500' : pct < 70 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
            style={{ width: `${pct}%` }}
          ></div>
        </div>
        <div className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{pct}% funded</div>
      </div>

      <button 
        onClick={() => onDonateClick(ngo.id)}
        className="w-full py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex items-center justify-center gap-2"
      >
        <Heart size={16} />
        Donate
      </button>
    </div>
  );
};

export default NgoCard;
