import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Send, Sparkles, Package2 } from 'lucide-react';

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
    ngoId: selectedNgo?.id ?? '',
    donationType: donationTypes[0],
    transport: 'google_maps',
    quantity: '1 box',
    notes: '',
  });

  useEffect(() => {
    if (selectedNgo?.id) {
      setFormData((prev) => ({ ...prev, ngoId: selectedNgo.id }));
    }
  }, [selectedNgo]);

  const activeNgo = useMemo(
    () => ngos.find((ngo) => ngo.id === formData.ngoId) ?? null,
    [formData.ngoId, ngos],
  );

  const selectedNgoLabel = activeNgo?.name ?? 'Choose an NGO';

  const routeUrl = useMemo(() => {
    if (!activeNgo) {
      return '';
    }

    const query = encodeURIComponent(`${activeNgo.address || activeNgo.name}, ${activeNgo.city || 'Pakistan'}`);

    switch (formData.transport) {
      case 'google_maps':
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
      case 'indrive':
        return 'https://www.indrive.com/';
      case 'careem':
        return 'https://www.careem.com/';
      case 'bykea':
        return 'https://www.bykea.com/';
      default:
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
  }, [activeNgo, formData.transport]);

  const handleOpenRoute = () => {
    if (!routeUrl) {
      return;
    }

    window.open(routeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...formData,
      ngoLabel: selectedNgoLabel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">Donation request</p>
        <h3 className="mt-1 text-xl font-black text-slate-900">Quick support form</h3>
        <p className="mt-1 text-sm text-slate-500">A simple form for your donation request.</p>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-600">
        Your Name
        <input
          required
          value={formData.donorName}
          onChange={(e) => setFormData((prev) => ({ ...prev, donorName: e.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
          placeholder="Enter your full name"
        />
      </label>

      <label className="space-y-2 text-sm font-semibold text-slate-600">
        Select NGO
        <select
          required
          value={formData.ngoId}
          onChange={(e) => setFormData((prev) => ({ ...prev, ngoId: e.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
        >
          <option value="">Choose an NGO...</option>
          {ngos.map((ngo) => (
            <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-600">
          What are you donating?
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
        Open route in
        <select
          value={formData.transport}
          onChange={(e) => setFormData((prev) => ({ ...prev, transport: e.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
        >
          <option value="google_maps">Google Maps</option>
          <option value="indrive">InDrive</option>
          <option value="careem">Careem</option>
          <option value="bykea">Bykea</option>
        </select>
      </label>

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
          <p>Selected NGO: <strong>{selectedNgoLabel}</strong>. Use the button below to open the destination directly in your chosen transport app or map.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenRoute}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
      >
        <Send size={16} />
        Open route in {formData.transport === 'google_maps' ? 'Google Maps' : formData.transport === 'indrive' ? 'InDrive' : formData.transport === 'careem' ? 'Careem' : 'Bykea'}
      </button>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        Submit donation request
      </button>
    </form>
  );
}
