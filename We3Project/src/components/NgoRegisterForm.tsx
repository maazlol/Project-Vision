import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Upload,
  Check,
  AlertCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Landmark,
  Wallet,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { useToast } from './Toast';

const STEPS = [
  { title: 'NGO Details', icon: Building2 },
  { title: 'Registration', icon: FileText },
  { title: 'Payments', icon: Landmark },
];

type FormData = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  website: string;
  description: string;
  registrationNumber: string;
  registrationType: string;
  yearEstablished: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  easypaisa: string;
  jazzcash: string;
};

type FieldKey = keyof FormData;
type Errors = Partial<Record<FieldKey | 'registrationCert' | 'taxCert' | 'payment', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REG_NO_RE = /^[A-Za-z0-9-]+$/;
const PK_PHONE_RE = /^(?:\+92|92|0)?3\d{9}$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const YEAR_RE = /^(19|20)\d{2}$/;

function digitsOnly(value: string, max?: number): string {
  const d = value.replace(/\D/g, '');
  return max != null ? d.slice(0, max) : d;
}

/** Normalize for PK mobile checks: store as user typed; validate cleaned. */
function normalizePkPhone(value: string): string {
  return value.replace(/[\s-]/g, '');
}

function isValidPkPhone(value: string): boolean {
  return PK_PHONE_RE.test(normalizePkPhone(value));
}

function isValidMobile11(value: string): boolean {
  return /^\d{11}$/.test(value);
}

function composeBankDetails(bankName: string, accountTitle: string, accountNumber: string): string {
  const parts = [
    bankName.trim() && `Bank: ${bankName.trim()}`,
    accountTitle.trim() && `Title: ${accountTitle.trim()}`,
    accountNumber.trim() && `Account: ${accountNumber.trim()}`,
  ].filter(Boolean);
  return parts.join('\n');
}

export default function NgoRegisterForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    website: '',
    description: '',
    registrationNumber: '',
    registrationType: 'SECP',
    yearEstablished: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    easypaisa: '',
    jazzcash: '',
  });

  const [files, setFiles] = useState<{
    registrationCert: File | null;
    taxCert: File | null;
    authorizationLetter: File | null;
  }>({
    registrationCert: null,
    taxCert: null,
    authorizationLetter: null,
  });

  const [previews, setPreviews] = useState<{
    registrationCert: string | null;
    taxCert: string | null;
    authorizationLetter: string | null;
  }>({
    registrationCert: null,
    taxCert: null,
    authorizationLetter: null,
  });

  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [showStepErrors, setShowStepErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSuccess] = useState(false);
  const { showToast } = useToast();

  const regCertRef = useRef<HTMLInputElement>(null);
  const taxCertRef = useRef<HTMLInputElement>(null);
  const authLetterRef = useRef<HTMLInputElement>(null);

  // Wait for auth restore so owner query does not run unauthenticated
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setExistingApplication(null);
        setCheckingExisting(false);
        return;
      }
      setCheckingExisting(true);
      try {
        const q = query(collection(db, 'ngoRegister'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setExistingApplication({
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data(),
          });
        } else {
          setExistingApplication(null);
        }
      } catch (err) {
        console.error('Error checking NGO registration status:', err);
      } finally {
        setCheckingExisting(false);
      }
    });
    return () => unsub();
  }, []);

  const errors: Errors = useMemo(() => {
    const e: Errors = {};
    const name = formData.name.trim();
    if (!name) e.name = 'NGO name is required.';
    else if (name.length < 3) e.name = 'NGO name must be at least 3 characters.';
    else if (name.length > 100) e.name = 'NGO name must be at most 100 characters.';

    const contact = formData.contactName.trim();
    if (!contact) e.contactName = 'Contact person is required.';
    else if (contact.length < 3) e.contactName = 'Contact name must be at least 3 characters.';
    else if (contact.length > 100) e.contactName = 'Contact name must be at most 100 characters.';

    const email = formData.email.trim();
    if (!email) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address.';

    const phone = formData.phone.trim();
    if (!phone) e.phone = 'Phone is required.';
    else if (!isValidPkPhone(phone)) e.phone = 'Enter a valid Pakistani mobile (e.g. 03XXXXXXXXX).';

    const city = formData.city.trim();
    if (!city) e.city = 'City is required.';
    else if (city.length < 2) e.city = 'City must be at least 2 characters.';
    else if (city.length > 80) e.city = 'City must be at most 80 characters.';

    const address = formData.address.trim();
    if (!address) e.address = 'Address is required.';
    else if (address.length > 250) e.address = 'Address must be at most 250 characters.';

    const website = formData.website.trim();
    if (website && !URL_RE.test(website)) e.website = 'Enter a valid URL (https://…).';

    const description = formData.description.trim();
    if (!description) e.description = 'Description is required.';
    else if (description.length < 20) e.description = 'Description must be at least 20 characters.';
    else if (description.length > 500) e.description = 'Description must be at most 500 characters.';

    const regNo = formData.registrationNumber.trim();
    if (!regNo) e.registrationNumber = 'Registration number is required.';
    else if (!REG_NO_RE.test(regNo)) e.registrationNumber = 'Only letters, numbers, and "-" are allowed.';
    else if (regNo.length < 3) e.registrationNumber = 'Registration number must be at least 3 characters.';
    else if (regNo.length > 40) e.registrationNumber = 'Registration number is too long.';

    const year = formData.yearEstablished.trim();
    if (!year) e.yearEstablished = 'Year established is required.';
    else if (!YEAR_RE.test(year)) e.yearEstablished = 'Enter a valid year (e.g. 2018).';
    else if (Number(year) > new Date().getFullYear()) e.yearEstablished = 'Year cannot be in the future.';

    if (!files.registrationCert) e.registrationCert = 'Registration certificate is required.';
    if (!files.taxCert) e.taxCert = 'Tax / NTN certificate is required.';

    const bankName = formData.bankName.trim();
    const accountTitle = formData.accountTitle.trim();
    const accountNumber = formData.accountNumber.trim();
    const anyBank = !!(bankName || accountTitle || accountNumber);

    if (anyBank) {
      if (!bankName) e.bankName = 'Bank name is required when using bank details.';
      else if (bankName.length < 2) e.bankName = 'Bank name is too short.';
      else if (bankName.length > 60) e.bankName = 'Bank name is too long.';

      if (!accountTitle) e.accountTitle = 'Account title is required when using bank details.';
      else if (accountTitle.length < 3) e.accountTitle = 'Account title is too short.';
      else if (accountTitle.length > 100) e.accountTitle = 'Account title is too long.';

      if (!accountNumber) e.accountNumber = 'Account number is required when using bank details.';
      else if (!/^\d{8,24}$/.test(accountNumber)) e.accountNumber = 'Account number must be 8–24 digits.';
    }

    const ep = formData.easypaisa.trim();
    if (ep && !isValidMobile11(ep)) e.easypaisa = 'EasyPaisa must be 11 digits.';

    const jc = formData.jazzcash.trim();
    if (jc && !isValidMobile11(jc)) e.jazzcash = 'JazzCash must be 11 digits.';

    const bankComplete =
      bankName &&
      accountTitle &&
      /^\d{8,24}$/.test(accountNumber) &&
      !e.bankName &&
      !e.accountTitle &&
      !e.accountNumber;
    const hasPayment =
      !!bankComplete || isValidMobile11(ep) || isValidMobile11(jc);

    if (!hasPayment) {
      e.payment = 'Provide complete bank details or an 11-digit EasyPaisa / JazzCash number.';
    }

    return e;
  }, [formData, files]);

  const stepFieldKeys: Record<number, string[]> = {
    0: ['name', 'contactName', 'email', 'phone', 'city', 'address', 'website', 'description'],
    1: ['registrationNumber', 'yearEstablished', 'registrationCert', 'taxCert'],
    2: ['bankName', 'accountTitle', 'accountNumber', 'easypaisa', 'jazzcash', 'payment'],
  };

  const isStepValid = (step: number) =>
    !(stepFieldKeys[step] || []).some((k) => errors[k as keyof Errors]);

  const showError = (key: string) =>
    (showStepErrors || touched[key]) && errors[key as keyof Errors]
      ? errors[key as keyof Errors]
      : undefined;

  const setField = (key: FieldKey, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: keyof typeof files
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      setFiles((prev) => ({ ...prev, [type]: file }));
      setTouched((prev) => ({ ...prev, [type]: true }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1200;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas toBlob failed'));
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const goNext = () => {
    if (!isStepValid(currentStep)) {
      setShowStepErrors(true);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setShowStepErrors(false);
    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(2)) {
      setShowStepErrors(true);
      showToast(errors.payment || 'Please fix the payment fields.', 'error');
      return;
    }
    if (!isStepValid(0) || !isStepValid(1)) {
      showToast('Please complete all previous steps.', 'error');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showToast('Please login to submit application.', 'error');
        setLoading(false);
        return;
      }

      const compressAndConvert = async (file: File | null) => {
        if (!file) return null;
        const compressed = await compressImage(file);
        return await blobToBase64(compressed);
      };

      const [registrationCert, taxCert, authorizationLetter] = await Promise.all([
        compressAndConvert(files.registrationCert),
        compressAndConvert(files.taxCert),
        compressAndConvert(files.authorizationLetter),
      ]);

      const bankDetails = composeBankDetails(
        formData.bankName,
        formData.accountTitle,
        formData.accountNumber
      );

      await addDoc(collection(db, 'ngoRegister'), {
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        website: formData.website.trim(),
        description: formData.description.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        registrationType: formData.registrationType,
        yearEstablished: formData.yearEstablished.trim(),
        bankName: formData.bankName.trim(),
        accountTitle: formData.accountTitle.trim(),
        accountNumber: formData.accountNumber.trim(),
        bankDetails,
        easypaisa: formData.easypaisa.trim(),
        jazzcash: formData.jazzcash.trim(),
        registrationCert,
        taxCert,
        authorizationLetter,
        status: 'pending',
        userId,
        submittedAt: serverTimestamp(),
      });

      setSuccess(true);
      showToast('NGO registration submitted!', 'success');
    } catch (error: unknown) {
      console.error('NGO registration error:', error);
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      if (code === 'permission-denied') {
        showToast(
          'Permission denied. Please stay logged in and try again. If it continues, ask an admin to check Firestore rules for ngoRegister.',
          'error'
        );
      } else if (code === 'invalid-argument') {
        showToast(
          'Submission too large. Use smaller document images (under 1MB total) and try again.',
          'error'
        );
      } else {
        showToast('Error submitting application.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (existingApplication || submitted) {
    const status = existingApplication?.status || 'pending';
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/feed"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-emerald-50 transition-all">
            <ArrowLeft size={18} />
          </div>
          Back to Feed
        </Link>
        <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-emerald-100 animate-zoom-in">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              status === 'approved'
                ? 'bg-emerald-100 text-emerald-600'
                : status === 'rejected'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
            }`}
          >
            {status === 'approved' && <CheckCircle2 size={40} />}
            {status === 'rejected' && <XCircle size={40} />}
            {status === 'pending' && <Clock size={40} />}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">
            {String(status).toUpperCase()} Application
          </h2>
          <p className="text-slate-600 mb-8">
            {status === 'approved'
              ? 'Your NGO is approved. Open the NGO Portal from the navbar to manage your profile.'
              : status === 'rejected'
                ? 'Your application was rejected. Contact support if you need help reapplying.'
                : 'Your NGO registration is under review. You will get portal access once approved.'}
          </p>
          <Link
            to={status === 'approved' ? '/ngo-portal' : '/feed'}
            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all inline-block"
          >
            {status === 'approved' ? 'Open NGO Portal' : 'Go to Feed'}
          </Link>
        </div>
      </div>
    );
  }

  const stepValid = isStepValid(currentStep);
  const canSubmit = isStepValid(0) && isStepValid(1) && isStepValid(2) && !loading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/feed"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-emerald-50 transition-all">
          <ArrowLeft size={18} />
        </div>
        Back to Feed
      </Link>
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="md:col-span-2 bg-emerald-600 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/20">
                <Building2 size={24} />
              </div>
              <h2 className="text-3xl font-black mb-4">NGO Register</h2>
              <p className="text-emerald-100 text-sm font-medium opacity-90">
                Apply for portal access. Admins review documents, then unlock your NGO Profile.
              </p>
              <div className="mt-12 space-y-8">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = currentStep === idx;
                  const isCompleted = currentStep > idx;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                          isActive
                            ? 'bg-white text-emerald-600 border-white scale-110 shadow-lg'
                            : isCompleted
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-transparent text-emerald-200 border-emerald-400/30'
                        }`}
                      >
                        {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                      </div>
                      <div className={isActive ? 'font-bold' : 'opacity-60 text-sm'}>
                        <div className="text-[10px] uppercase tracking-widest font-black mb-0.5">
                          Step {idx + 1}
                        </div>
                        <div className="text-sm">{step.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative z-10 mt-12 pt-8 border-t border-white/10 flex items-center gap-3 text-emerald-100/60">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Encrypted & Secure
              </span>
            </div>
          </div>

          <div className="md:col-span-3 p-10">
            {currentStep === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="NGO Name"
                    icon={<Building2 size={18} />}
                    value={formData.name}
                    onChange={(v) => setField('name', v.slice(0, 100))}
                    onBlur={() => markTouched('name')}
                    placeholder="Organization legal name"
                    error={showError('name')}
                  />
                  <Field
                    label="Contact Person"
                    icon={<User size={18} />}
                    value={formData.contactName}
                    onChange={(v) =>
                      setField('contactName', v.replace(/[^a-zA-Z\s.'-]/g, '').slice(0, 100))
                    }
                    onBlur={() => markTouched('contactName')}
                    placeholder="Full name"
                    error={showError('contactName')}
                  />
                  <Field
                    label="Email"
                    icon={<Mail size={18} />}
                    type="email"
                    value={formData.email}
                    onChange={(v) => setField('email', v.trimStart().slice(0, 120))}
                    onBlur={() => markTouched('email')}
                    placeholder="ngo@email.com"
                    error={showError('email')}
                  />
                  <Field
                    label="Phone"
                    icon={<Phone size={18} />}
                    value={formData.phone}
                    onChange={(v) =>
                      setField('phone', v.replace(/[^\d+]/g, '').slice(0, 14))
                    }
                    onBlur={() => markTouched('phone')}
                    placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                    error={showError('phone')}
                  />
                  <Field
                    label="City"
                    icon={<MapPin size={18} />}
                    value={formData.city}
                    onChange={(v) =>
                      setField('city', v.replace(/[^a-zA-Z\s.-]/g, '').slice(0, 80))
                    }
                    onBlur={() => markTouched('city')}
                    placeholder="e.g. Karachi"
                    error={showError('city')}
                  />
                  <Field
                    label="Website (optional)"
                    icon={<Globe size={18} />}
                    value={formData.website}
                    onChange={(v) => setField('website', v.trimStart().slice(0, 200))}
                    onBlur={() => markTouched('website')}
                    placeholder="https://"
                    required={false}
                    error={showError('website')}
                  />
                </div>
                <Field
                  label="Address"
                  icon={<MapPin size={18} />}
                  value={formData.address}
                  onChange={(v) => setField('address', v.slice(0, 250))}
                  onBlur={() => markTouched('address')}
                  placeholder="Street, area, city"
                  error={showError('address')}
                  hint={`${formData.address.trim().length}/250`}
                />
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Mission / Description
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea
                      rows={3}
                      required
                      value={formData.description}
                      onChange={(e) => setField('description', e.target.value.slice(0, 500))}
                      onBlur={() => markTouched('description')}
                      className={`w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all resize-none ${
                        showError('description') ? 'ring-2 ring-rose-400' : ''
                      }`}
                      placeholder="What does your NGO do? (20–500 characters)"
                    />
                  </div>
                  <div className="flex justify-between">
                    {showError('description') ? (
                      <p className="text-xs text-rose-500 font-medium">{showError('description')}</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-[10px] text-slate-400 font-bold">
                      {formData.description.trim().length}/500
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Registration Number"
                    icon={<FileText size={18} />}
                    value={formData.registrationNumber}
                    onChange={(v) =>
                      setField(
                        'registrationNumber',
                        v.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40)
                      )
                    }
                    onBlur={() => markTouched('registrationNumber')}
                    placeholder="e.g. RS-2020-12345"
                    error={showError('registrationNumber')}
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Registration Type
                    </label>
                    <select
                      value={formData.registrationType}
                      onChange={(e) => setField('registrationType', e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium"
                    >
                      <option value="SECP">SECP / Company</option>
                      <option value="Societies">Societies Act</option>
                      <option value="Trust">Trust</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Field
                    label="Year Established"
                    icon={<FileText size={18} />}
                    value={formData.yearEstablished}
                    onChange={(v) => setField('yearEstablished', digitsOnly(v, 4))}
                    onBlur={() => markTouched('yearEstablished')}
                    placeholder="YYYY"
                    maxLength={4}
                    error={showError('yearEstablished')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <DocUpload
                    label="Registration Cert"
                    preview={previews.registrationCert}
                    inputRef={regCertRef}
                    onChange={(e) => handleFileChange(e, 'registrationCert')}
                    error={showError('registrationCert')}
                  />
                  <DocUpload
                    label="Tax / NTN Cert"
                    preview={previews.taxCert}
                    inputRef={taxCertRef}
                    onChange={(e) => handleFileChange(e, 'taxCert')}
                    error={showError('taxCert')}
                  />
                  <DocUpload
                    label="Auth Letter (opt)"
                    preview={previews.authorizationLetter}
                    inputRef={authLetterRef}
                    onChange={(e) => handleFileChange(e, 'authorizationLetter')}
                  />
                </div>
                <div className="bg-amber-50 p-4 rounded-xl flex gap-3 text-left">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-xs text-amber-800">
                    Upload clear scans of official registration and tax documents (max 5MB each).
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <p className="text-sm text-slate-500 font-medium">
                  These details appear on your NGO Profile and are shown to individual donors.
                  Provide at least one complete payment method.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Bank Name"
                    icon={<Landmark size={18} />}
                    value={formData.bankName}
                    onChange={(v) =>
                      setField('bankName', v.replace(/[^a-zA-Z\s&.-]/g, '').slice(0, 60))
                    }
                    onBlur={() => markTouched('bankName')}
                    placeholder="e.g. HBL"
                    required={false}
                    error={showError('bankName')}
                  />
                  <Field
                    label="Account Title"
                    icon={<User size={18} />}
                    value={formData.accountTitle}
                    onChange={(v) =>
                      setField('accountTitle', v.replace(/[^a-zA-Z\s.'-]/g, '').slice(0, 100))
                    }
                    onBlur={() => markTouched('accountTitle')}
                    placeholder="Account holder name"
                    required={false}
                    error={showError('accountTitle')}
                  />
                  <Field
                    label="Account Number"
                    icon={<FileText size={18} />}
                    value={formData.accountNumber}
                    onChange={(v) => setField('accountNumber', digitsOnly(v, 24))}
                    onBlur={() => markTouched('accountNumber')}
                    placeholder="8–24 digits"
                    required={false}
                    error={showError('accountNumber')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="EasyPaisa"
                    icon={<Wallet size={18} />}
                    value={formData.easypaisa}
                    onChange={(v) => setField('easypaisa', digitsOnly(v, 11))}
                    onBlur={() => markTouched('easypaisa')}
                    placeholder="03XXXXXXXXX"
                    required={false}
                    error={showError('easypaisa')}
                  />
                  <Field
                    label="JazzCash"
                    icon={<Wallet size={18} />}
                    value={formData.jazzcash}
                    onChange={(v) => setField('jazzcash', digitsOnly(v, 11))}
                    onBlur={() => markTouched('jazzcash')}
                    placeholder="03XXXXXXXXX"
                    required={false}
                    error={showError('jazzcash')}
                  />
                </div>
                {showError('payment') && (
                  <div className="bg-rose-50 p-4 rounded-xl flex gap-3 text-left">
                    <AlertCircle className="text-rose-500 shrink-0" size={18} />
                    <p className="text-xs text-rose-600 font-medium">{showError('payment')}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowStepErrors(false);
                    setCurrentStep((prev) => prev - 1);
                  }}
                  className="text-slate-400 font-bold"
                >
                  Previous
                </button>
              )}
              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold ml-auto disabled:opacity-50"
                  disabled={!stepValid && showStepErrors}
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    'Finish & Submit'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  required = true,
  maxLength,
  error,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        {label}
        {!required && <span className="normal-case font-medium text-slate-400"> (optional)</span>}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          type={type}
          required={required}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all ${
            error ? 'ring-2 ring-rose-400' : ''
          }`}
          placeholder={placeholder}
        />
      </div>
      {(error || hint) && (
        <div className="flex justify-between gap-2">
          {error ? <p className="text-xs text-rose-500 font-medium">{error}</p> : <span />}
          {hint && <p className="text-[10px] text-slate-400 font-bold shrink-0">{hint}</p>}
        </div>
      )}
    </div>
  );
}

function DocUpload({
  label,
  preview,
  inputRef,
  onChange,
  error,
}: {
  label: string;
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative aspect-[1.2/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer p-3 text-center ${
          preview
            ? 'border-emerald-500 bg-emerald-50'
            : error
              ? 'border-rose-400 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        {preview ? (
          preview.startsWith('data:image') ? (
            <img src={preview} alt={label} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <CheckCircle2 className="text-emerald-600" size={28} />
          )
        ) : (
          <>
            <Upload size={20} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {label}
            </span>
          </>
        )}
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*,.pdf"
          onChange={onChange}
        />
      </div>
      {error && <p className="text-[10px] text-rose-500 font-medium text-center">{error}</p>}
    </div>
  );
}
