import { Heart } from 'lucide-react';

interface DonateFormProps {
  ngos: any[];
  selectedNgoId: string;
  setSelectedNgoId: (id: string) => void;
  donationAmount: number | '';
  setDonationAmount: (amount: number | '') => void;
  onDonate: () => void;
}

const DonateForm = ({ 
  ngos, 
  selectedNgoId, 
  setSelectedNgoId, 
  donationAmount, 
  setDonationAmount, 
  onDonate 
}: DonateFormProps) => {
  return (
    <div className="bg-emerald-600 rounded-[2rem] p-8 shadow-xl shadow-emerald-200/50 text-white" id="donate-section">
      <h2 className="text-2xl font-black mb-2">Donate Credits</h2>
      <p className="text-emerald-100 text-sm mb-8 opacity-80">1 meal = Rs. 100 in credits.</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Select NGO / School</label>
          <select 
            value={selectedNgoId}
            onChange={(e) => setSelectedNgoId(e.target.value)}
            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-white transition-all appearance-none"
          >
            <option value="" className="text-slate-900">-- Choose NGO --</option>
            {ngos.map(n => <option key={n.id} value={n.id} className="text-slate-900">{n.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest mb-4 opacity-70">Amount (Rs.)</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[100, 200, 300, 500].map(amt => (
              <button 
                key={amt}
                onClick={() => setDonationAmount(amt)}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${donationAmount === amt ? 'bg-white text-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Rs. {amt}
              </button>
            ))}
          </div>
          <input 
            type="number" 
            value={donationAmount}
            onChange={(e) => setDonationAmount(parseInt(e.target.value) || '')}
            placeholder="Custom amount"
            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-all"
          />
        </div>

        {donationAmount && donationAmount >= 50 && (
          <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center gap-3 animate-pulse">
            <Heart size={20} className="text-emerald-200" />
            <p className="text-xs font-medium">This will provide <strong>{Math.floor(donationAmount / 100)} meals</strong> to children.</p>
          </div>
        )}

        <button 
          onClick={onDonate}
          className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black text-lg hover:bg-emerald-50 transition-all shadow-xl shadow-black/10"
        >
          Donate Now
        </button>
      </div>
    </div>
  );
};

export default DonateForm;
