import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Send, Package2, X, Camera, MapPin, Truck } from 'lucide-react';

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
  isOpen: boolean;
  onClose: () => void;
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

export default function DonationRequestForm({ isOpen, onClose, ngos, selectedNgo, onSubmit }: DonationRequestFormProps) {
  const [formData, setFormData] = useState({
    donorName: '',
    ngoId: selectedNgo?.id ?? '',
    donationType: donationTypes[0],
    donationDetails: '',
    transport: 'self_drive',
    quantity: '1 box',
    notes: '',
    vehicleNumber: '',
    routeLink: '',
    photo: null as File | null,
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
    if (!activeNgo) return '';
    const query = encodeURIComponent(`${activeNgo.address || activeNgo.name}, ${activeNgo.city || 'Pakistan'}`);
    
    switch (formData.transport) {
      case 'indrive': return 'https://www.indrive.com/';
      case 'careem': return 'https://www.careem.com/';
      default: return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
  }, [activeNgo, formData.transport]);

  const handleOpenRoute = () => {
    if (!routeUrl) return;
    window.open(routeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      donorName: formData.donorName,
      ngoId: formData.ngoId,
      donationType: formData.donationType,
      donationDetails: formData.donationDetails,
      transport: formData.transport,
      quantity: formData.quantity,
      notes: formData.notes,
      vehicleNumber: formData.vehicleNumber,
      routeLink: formData.routeLink,
      ngoLabel: selectedNgoLabel,
      photoName: formData.photo?.name ?? '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">Donation request</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">Send Donation Details</h3>
            <p className="mt-1 text-sm text-slate-500">Provide the details for your donation drop-off.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-600">
              Your Name
              <input
                required
                value={formData.donorName}
                onChange={(e) => setFormData((prev) => ({ ...prev, donorName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                placeholder="Enter your name"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-600">
              Select NGO
              <select
                required
                value={formData.ngoId}
                onChange={(e) => setFormData((prev) => ({ ...prev, ngoId: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              >
                <option value="">Choose an NGO...</option>
                {ngos.map((ngo) => (
                  <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-600">
              Donation Type
              <select
                value={formData.donationType}
                onChange={(e) => setFormData((prev) => ({ ...prev, donationType: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              >
                {donationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-600">
              Quantity / Detail
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-500 focus-within:bg-white transition">
                <Package2 size={18} className="text-slate-400" />
                <input
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="e.g. 10 food packs"
                />
              </div>
            </label>
          </div>

          {/* Dynamic Donation Fields */}
          {(formData.donationType === 'Food Packages' || formData.donationType === 'Clothes') && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="space-y-2 text-sm font-semibold text-slate-600">
                {formData.donationType === 'Food Packages' ? 'Food Details (Type, Expiry, etc.)' : 'Cloth Details (Size, Type, Condition)' }
                <textarea
                  value={formData.donationDetails}
                  onChange={(e) => setFormData((prev) => ({ ...prev, donationDetails: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                  rows={2}
                  placeholder={`Provide more info about the ${formData.donationType.toLowerCase()}...`}
                />
              </label>
            </div>
          )}

          {/* Picture Upload */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-600">Donation Picture (Optional)</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/50">
              <Camera size={24} className="text-slate-400" />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">{formData.photo ? formData.photo.name : 'Click to upload picture'}</p>
                <p className="text-xs text-slate-500">Provide a picture of what you are donating</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFormData((prev) => ({ ...prev, photo: e.target.files?.[0] || null }))}
              />
            </label>
          </div>

          {/* Transport and Route */}
          <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-2 text-sm font-semibold text-slate-600">
                Transport Option
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-emerald-500 transition">
                  <Truck size={18} className="text-slate-400" />
                  <select
                    value={formData.transport}
                    onChange={(e) => setFormData((prev) => ({ ...prev, transport: e.target.value }))}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    <option value="self_drive">Self-Drive</option>
                    <option value="indrive">InDrive</option>
                    <option value="careem">Careem</option>
                  </select>
                </div>
              </label>

              <button
                type="button"
                onClick={handleOpenRoute}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <MapPin size={18} />
                Open Route
              </button>
            </div>

            {formData.transport !== 'self_drive' && (
              <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-top-2">
                <label className="space-y-2 text-sm font-semibold text-slate-600">
                  Vehicle Number
                  <input
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                    placeholder="e.g. ABC-123"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-600">
                  Vehicle Route Link
                  <input
                    value={formData.routeLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, routeLink: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                    placeholder="Paste link here..."
                  />
                </label>
              </div>
            )}
          </div>

          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Notes
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              placeholder="Any additional notes for the NGO..."
            />
          </label>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
            >
              <Send size={18} />
              Done / Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
