import { useState } from 'react';
import NgoCard from './NgoCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface NgoListProps {
  ngos: any[];
  filter: string;
  setFilter: (filter: string) => void;
  onDonateClick: (ngoId: string) => void;
}

const NgoList = ({ ngos, filter, setFilter, onDonateClick }: NgoListProps) => {
  const [showAll, setShowAll] = useState(false);

  // Apply original filtering logic
  const applyOriginalFilter = (ngo: any) => {
    if (filter === 'school') return ngo.category === 'Education' || ngo.type === 'school';
    if (filter === 'ngo') return ngo.category !== 'Education' && ngo.type !== 'school';
    if (filter === 'verified') return ngo.verified === true;
    return true;
  };

  const filteredNgos = ngos.filter(applyOriginalFilter);
  const displayNgos = showAll ? filteredNgos : filteredNgos.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Support NGOs & Schools</h2>
          <p className="text-slate-500">Helping those in most critical need first.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          {['all', 'school', 'ngo', 'verified'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setShowAll(false); // Reset showAll when filter changes
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayNgos.map((ngo) => (
          <NgoCard key={ngo.id} ngo={ngo} onDonateClick={onDonateClick} />
        ))}
      </div>

      {filteredNgos.length > 6 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp size={20} />
              </>
            ) : (
              <>
                Show More ({filteredNgos.length - 6} more) <ChevronDown size={20} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default NgoList;
