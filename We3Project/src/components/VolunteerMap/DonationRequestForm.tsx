import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Heart, Send, Phone, Sparkles, Package2 } from 'lucide-react';

interface NGO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  address?: string;
  type?: string;
}

interface DonationRequestFormProps {
  ngos: NGO[];
  selectedNgo: NGO | null;
  onSubmit: (payload: Record<string, string>) => void;
}

const donationTypes = [
  'Food Packages',
  'Clothes',
  'Medicines',
  'Books & School Supplies',
  'Cash / Credit Support',
];

export default function DonationRequestForm({ ngos, selectedNgo, onSubmit }: DonationRequestFormProps) {
  const [formData, setFormData] = useState({
    donorName: '',
    donorPhone: '',
    ngoId: selectedNgo?.id ?? '',
    donationType: donationTypes[0],
    quantity: '1 box',
    notes: '',
  });

  useEffect(() => {
    if (selectedNgo?.id) {
      setFormData((prev) => ({ ...prev, ngoId: selectedNgo.id }));
    }
  }, [selectedNgo]);

  const selectedNgoLabel = useMemo(
    () => ngos.find((ngo) => ngo.id === formData.ngoId)?.name ?? 'Choose an NGO',
    [formData.ngoId, ngos],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...formData,
      ngoLabel: selectedNgoLabel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">Donation request</p>
          <h3 className="mt-2 text-xl font-black text-slate-900">Plan your support</h3>
          <p className="mt-1 text-sm text-slate-500">Choose what you want to donate and which NGO you want to support.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <Heart size={18} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-600">
          Your name
          <input
            required
            value={formData.donorName}
            onChange={(e) => setFormData((prev) => ({ ...prev, donorName: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white"
            placeholder="Ali Khan"
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-600">
          Contact number
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:bg-white">
            <Phone size={15} className="text-slate-400" />
            <input
              required
              value={formData.donorPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, donorPhone: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="+92 3XX XXXXXXX"
            />
          </span>
        </label>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-600">
        NGO / School
        <select
          required
          value={formData.ngoId}
          onChange={(e) => setFormData((prev) => ({ ...prev, ngoId: e.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white"
        >
          <option value="">Select an NGO</option>
          {ngos.map((ngo) => (
            <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-600">
          Donation type
          <select
            value={formData.donationType}
            onChange={(e) => setFormData((prev) => ({ ...prev, donationType: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white"
          >
            {donationTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-600">
          Quantity / detail
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:bg-white">
            <Package2 size={15} className="text-slate-400" />
            <input
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="e.g. 10 food packs"
            />
          </span>
        </label>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-600">
        Notes
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white"
          placeholder="Mention pickup time, urgency, school/NGO need, or other details."
        />
      </label>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 shrink-0" />
          <p>Selected NGO: <strong>{selectedNgoLabel}</strong>. This request will be saved in your local dashboard for follow-up.</p>
        </div>
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
      >
        <Send size={16} />
        Submit Donation Request
      </button>
    </form>
  );
}
