import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  ArrowLeft,
  Building2,
  Camera,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Save,
  Landmark,
  Wallet,
} from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { useNgoPortal } from '../../lib/useNgoPortal';
import { useToast } from '../Toast';
import {
  NgoAccessDenied,
  NgoNotLinked,
  NgoPortalLoading,
} from './NgoPortalGuards';

interface ProfileFormState {
  name: string;
  description: string;
  contact: string;
  phone: string;
  address: string;
  city: string;
  website: string;
  bankDetails: string;
  easypaisa: string;
  jazzcash: string;
  logoUrl: string;
  qrCodeUrl: string;
}

const emptyForm: ProfileFormState = {
  name: '',
  description: '',
  contact: '',
  phone: '',
  address: '',
  city: '',
  website: '',
  bankDetails: '',
  easypaisa: '',
  jazzcash: '',
  logoUrl: '',
  qrCodeUrl: '',
};

const NgoProfile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { profile, authLoading, ngo, loading } = useNgoPortal({ donationLimit: 1 });

  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) navigate('/login');
  }, [authLoading, profile, navigate]);

  useEffect(() => {
    if (!ngo) return;
    setForm({
      name: ngo.name || '',
      description: ngo.description || '',
      contact: ngo.contact || '',
      phone: ngo.phone || '',
      address: ngo.address || '',
      city: ngo.city || '',
      website: ngo.website || '',
      bankDetails: ngo.bankDetails || '',
      easypaisa: ngo.easypaisa || '',
      jazzcash: ngo.jazzcash || '',
      logoUrl: ngo.logoUrl || '',
      qrCodeUrl: ngo.qrCodeUrl || '',
    });
  }, [ngo]);

  const setField = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadImage = async (file: File, folder: 'logo' | 'qr'): Promise<string> => {
    if (!ngo?.id) throw new Error('NGO not linked');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `ngos/${ngo.id}/${folder}_${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, 'logo');
      setField('logoUrl', url);
      showToast('Logo uploaded. Save profile to keep changes.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Logo upload failed.', 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleQrChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const url = await uploadImage(file, 'qr');
      setField('qrCodeUrl', url);
      showToast('QR code uploaded. Save profile to keep changes.', 'success');
    } catch (err) {
      console.error(err);
      showToast('QR upload failed.', 'error');
    } finally {
      setUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!ngo?.id) return;
    if (!form.name.trim()) {
      showToast('NGO name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'Ngos', ngo.id), {
        name: form.name.trim(),
        description: form.description.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        website: form.website.trim(),
        bankDetails: form.bankDetails.trim(),
        easypaisa: form.easypaisa.trim(),
        jazzcash: form.jazzcash.trim(),
        logoUrl: form.logoUrl || null,
        qrCodeUrl: form.qrCodeUrl || null,
      });
      showToast('NGO profile updated.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not save profile. Check permissions and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <NgoPortalLoading />;
  if (profile?.role !== 'ngo') return <NgoAccessDenied />;
  if (!ngo) return <NgoNotLinked />;

  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              NGO Portal
            </p>
            <h1 className="text-3xl font-black text-slate-900">NGO Profile</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Edit public information and payment details for donors.
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

        <form
          onSubmit={handleSave}
          className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-10"
        >
          {/* Logo + QR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Logo
              </p>
              <div className="w-32 h-32 rounded-2xl border-4 border-emerald-500 bg-emerald-50 flex items-center justify-center overflow-hidden relative group mb-4">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="text-emerald-600" size={40} />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  {uploadingLogo ? (
                    <Loader2 className="text-white animate-spin" size={28} />
                  ) : (
                    <Camera className="text-white" size={28} />
                  )}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo || saving}
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400">Hover and click to upload logo</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Payment QR Code
              </p>
              <div className="w-32 h-32 rounded-2xl border-4 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group mb-4">
                {form.qrCodeUrl ? (
                  <img src={form.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
                ) : (
                  <QrCode className="text-slate-400" size={40} />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  {uploadingQr ? (
                    <Loader2 className="text-white animate-spin" size={28} />
                  ) : (
                    <Camera className="text-white" size={28} />
                  )}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleQrChange}
                    disabled={uploadingQr || saving}
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400">Upload JazzCash / EasyPaisa QR image</p>
            </div>
          </div>

          {/* Basic info */}
          <section className="space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 size={20} className="text-emerald-500" />
              Organization
            </h2>
            <Field
              label="NGO Name"
              icon={<Building2 size={16} />}
              value={form.name}
              onChange={(v) => setField('name', v)}
              required
            />
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Description
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium transition-all resize-y"
                placeholder="Tell donors about your mission and impact..."
              />
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Mail size={20} className="text-emerald-500" />
              Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="Email / Contact"
                icon={<Mail size={16} />}
                value={form.contact}
                onChange={(v) => setField('contact', v)}
                type="email"
                placeholder="contact@ngo.org"
              />
              <Field
                label="Phone"
                icon={<Phone size={16} />}
                value={form.phone}
                onChange={(v) => setField('phone', v)}
                placeholder="03XX-XXXXXXX"
              />
              <Field
                label="City"
                icon={<MapPin size={16} />}
                value={form.city}
                onChange={(v) => setField('city', v)}
                placeholder="Karachi"
              />
              <Field
                label="Website"
                icon={<Globe size={16} />}
                value={form.website}
                onChange={(v) => setField('website', v)}
                placeholder="https://"
              />
            </div>
            <Field
              label="Address"
              icon={<MapPin size={16} />}
              value={form.address}
              onChange={(v) => setField('address', v)}
              placeholder="Full street address"
            />
          </section>

          {/* Payment details */}
          <section className="space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Landmark size={20} className="text-emerald-500" />
              Payment Details
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <Landmark size={14} className="text-emerald-500" />
                Bank Details
              </label>
              <textarea
                rows={3}
                value={form.bankDetails}
                onChange={(e) => setField('bankDetails', e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium transition-all resize-y"
                placeholder="Bank name, account title, IBAN / account number"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="EasyPaisa"
                icon={<Wallet size={16} />}
                value={form.easypaisa}
                onChange={(v) => setField('easypaisa', v)}
                placeholder="03XX-XXXXXXX"
              />
              <Field
                label="JazzCash"
                icon={<Wallet size={16} />}
                value={form.jazzcash}
                onChange={(v) => setField('jazzcash', v)}
                placeholder="03XX-XXXXXXX"
              />
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploadingLogo || uploadingQr}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <RouterLink
              to="/ngo-portal"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  );
};

function Field({
  label,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
        <span className="text-emerald-500">{icon}</span>
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium transition-all"
      />
    </div>
  );
}

export default NgoProfile;
