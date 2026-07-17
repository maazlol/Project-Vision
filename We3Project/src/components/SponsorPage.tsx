import { useState, useRef, useEffect, type InputHTMLAttributes, type ReactNode } from 'react';
import { db, auth, storage } from '../lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { buildDonationPayload } from '../lib/donations';
import {
  Building2,
  User,
  Mail,
  CreditCard,
  Upload,
  AlertCircle,
  Hash,
  Send,
  Loader2,
  Video,
  CheckCircle2,
  Heart,
  Landmark,
  Phone,
  Copy,
} from 'lucide-react';
import { useToast } from './Toast';

const PAYMENT_METHODS = ['Card', 'EasyPaisa', 'JazzCash', 'Bank Transfer'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type PaymentFieldsState = {
  cardHolderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  accountHolderName: string;
  mobileNumber: string;
  bankName: string;
  accountNumber: string;
};

const emptyPaymentFields: PaymentFieldsState = {
  cardHolderName: '',
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  accountHolderName: '',
  mobileNumber: '',
  bankName: '',
  accountNumber: '',
};

const MAX_ACCOUNT_DIGITS = 24;

function generateTransactionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FH-${stamp}-${rand}`;
}

/** Letters and spaces only (names). */
function formatPersonName(value: string): string {
  return value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').slice(0, 60);
}

/** Letters, spaces, ampersand (bank names). */
function formatBankName(value: string): string {
  return value.replace(/[^a-zA-Z\s&.-]/g, '').replace(/\s+/g, ' ').slice(0, 40);
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiryDate(value: string): string {
  let digits = value.replace(/\D/g, '').slice(0, 4);

  // First month digit: only 0–1
  if (digits.length >= 1 && digits[0] > '1') {
    digits = `0${digits[0]}${digits.slice(1)}`.slice(0, 4);
  }
  // Second month digit: if first is 1, only 0–2
  if (digits.length >= 2) {
    const month = parseInt(digits.slice(0, 2), 10);
    if (month > 12) {
      digits = `12${digits.slice(2)}`;
    }
  }

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCvv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

function formatAccountNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_ACCOUNT_DIGITS);
}

/** 03XX-XXXXXXX (11 digits total). */
function formatMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function cardDigits(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '');
}

function mobileDigits(mobile: string): string {
  return mobile.replace(/\D/g, '');
}

function isValidExpiry(expiry: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const month = parseInt(expiry.slice(0, 2), 10);
  return month >= 1 && month <= 12;
}

function isValidMobile(mobile: string): boolean {
  const d = mobileDigits(mobile);
  return d.length === 11 && d.startsWith('03');
}

type PaymentFieldErrors = Partial<Record<keyof PaymentFieldsState, string>>;

/** Inline errors for non-empty invalid fields; empty fields stay silent until incomplete at submit gate. */
function getPaymentFieldErrors(
  method: PaymentMethod,
  fields: PaymentFieldsState
): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {};

  if (method === 'Card') {
    if (fields.cardHolderName && fields.cardHolderName.trim().length < 2) {
      errors.cardHolderName = 'Enter the name on the card (letters only).';
    }
    const cd = cardDigits(fields.cardNumber);
    if (fields.cardNumber && cd.length < 16) {
      errors.cardNumber = 'Card number must be 16 digits.';
    }
    if (fields.expiryDate) {
      if (!/^\d{2}\/\d{2}$/.test(fields.expiryDate)) {
        errors.expiryDate = 'Use MM/YY format.';
      } else {
        const month = parseInt(fields.expiryDate.slice(0, 2), 10);
        if (month < 1 || month > 12) {
          errors.expiryDate = 'Month must be between 01 and 12.';
        }
      }
    }
    if (fields.cvv && fields.cvv.length < 3) {
      errors.cvv = 'CVV must be 3 digits.';
    }
  } else if (method === 'EasyPaisa' || method === 'JazzCash') {
    if (fields.accountHolderName && fields.accountHolderName.trim().length < 2) {
      errors.accountHolderName = 'Enter account holder name (letters only).';
    }
    if (fields.mobileNumber) {
      const d = mobileDigits(fields.mobileNumber);
      if (d.length < 11) {
        errors.mobileNumber = 'Enter an 11-digit mobile number (03XX-XXXXXXX).';
      } else if (!d.startsWith('03')) {
        errors.mobileNumber = 'Mobile number must start with 03.';
      }
    }
  } else {
    if (fields.accountHolderName && fields.accountHolderName.trim().length < 2) {
      errors.accountHolderName = 'Enter account holder name (letters only).';
    }
    if (fields.bankName && fields.bankName.trim().length < 2) {
      errors.bankName = 'Enter a valid bank name.';
    }
    if (fields.accountNumber) {
      const len = fields.accountNumber.length;
      if (len < 8) {
        errors.accountNumber = 'Account number must be at least 8 digits.';
      } else if (len > MAX_ACCOUNT_DIGITS) {
        errors.accountNumber = `Maximum ${MAX_ACCOUNT_DIGITS} digits.`;
      }
    }
  }

  return errors;
}

function isPaymentFieldsValid(method: PaymentMethod, fields: PaymentFieldsState): boolean {
  if (method === 'Card') {
    return (
      fields.cardHolderName.trim().length >= 2 &&
      cardDigits(fields.cardNumber).length === 16 &&
      isValidExpiry(fields.expiryDate) &&
      fields.cvv.length === 3
    );
  }
  if (method === 'EasyPaisa' || method === 'JazzCash') {
    return fields.accountHolderName.trim().length >= 2 && isValidMobile(fields.mobileNumber);
  }
  return (
    fields.accountHolderName.trim().length >= 2 &&
    fields.bankName.trim().length >= 2 &&
    fields.accountNumber.length >= 8 &&
    fields.accountNumber.length <= MAX_ACCOUNT_DIGITS &&
    /^\d+$/.test(fields.accountNumber)
  );
}

function applyPaymentFieldChange(
  key: keyof PaymentFieldsState,
  value: string
): string {
  switch (key) {
    case 'cardHolderName':
    case 'accountHolderName':
      return formatPersonName(value);
    case 'bankName':
      return formatBankName(value);
    case 'cardNumber':
      return formatCardNumber(value);
    case 'expiryDate':
      return formatExpiryDate(value);
    case 'cvv':
      return formatCvv(value);
    case 'mobileNumber':
      return formatMobileNumber(value);
    case 'accountNumber':
      return formatAccountNumber(value);
    default:
      return value;
  }
}

export default function SponsorPage() {
  const [activeTab, setActiveTab] = useState<'corporate' | 'supporter'>('corporate');

  const formatCNIC = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 5) return val;
    if (val.length <= 12) return `${val.slice(0, 5)}-${val.slice(5)}`;
    return `${val.slice(0, 5)}-${val.slice(5, 12)}-${val.slice(12, 13)}`;
  };

  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Support <span className="text-emerald-600">FreeHunger</span>
          </h1>
          <p className="text-slate-600 font-medium max-w-2xl mx-auto">
            Join our mission to end hunger in Pakistan. Choose how you want to make an impact today.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
            <button
              onClick={() => setActiveTab('corporate')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'corporate'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Building2 size={18} /> Corporate
            </button>
            <button
              onClick={() => setActiveTab('supporter')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'supporter'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <User size={18} /> Individual
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in">
          {activeTab === 'corporate' ? (
            <CorporateForm formatCNIC={formatCNIC} />
          ) : (
            <SupporterForm formatCNIC={formatCNIC} />
          )}
        </div>
      </div>
    </div>
  );
}

function CorporateForm({ formatCNIC }: { formatCNIC: (v: string) => string }) {
  const AD_PACKAGES = [
    { id: 'starter', name: 'Starter Ad', price: 20000 },
    { id: 'growth', name: 'Growth Ad', price: 50000 },
    { id: 'premium', name: 'Premium Banner', price: 100000 },
    { id: 'enterprise', name: 'Enterprise Sponsor', price: 200000 },
  ];

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    cnic: '',
    email: '',
    phone: '',
    videoLink: '',
    selectedPackageId: 'starter',
    paymentMethod: 'Card' as PaymentMethod,
    ...emptyPaymentFields,
  });

  const [adFile, setAdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedTid, setGeneratedTid] = useState('');
  const { showToast } = useToast();
  const adInputRef = useRef<HTMLInputElement>(null);

  const selectedPkg = AD_PACKAGES.find((p) => p.id === formData.selectedPackageId) || AD_PACKAGES[0];
  const subtotal = selectedPkg.price;
  const websiteFee = subtotal * 0.02;
  const totalPayable = subtotal + websiteFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return showToast('Enter company name', 'error');
    // Firestore sponsors create requires auth (see firestore.rules).
    const user = auth.currentUser;
    if (!user) {
      return showToast('Please sign in to complete corporate sponsorship payment.', 'error');
    }

    const tid = generateTransactionId();
    setGeneratedTid(tid);
    setProcessing(true);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 2200));

    try {
      let videoUrl = formData.videoLink;
      if (adFile) {
        try {
          const timestamp = Date.now();
          const storageRef = ref(
            storage,
            `sponsors/ads/${user.uid}_${timestamp}_${adFile.name}`
          );
          const uploadResult = await uploadBytes(storageRef, adFile);
          videoUrl = await getDownloadURL(uploadResult.ref);
        } catch (err) {
          console.error('Storage upload failed', err);
          showToast('Video upload failed. Please provide a link instead.', 'error');
          setProcessing(false);
          setLoading(false);
          return;
        }
      }

      // Sponsor request for Admin Panel → Sponsors (status stays pending until admin acts).
      // Field names align with seed/Admin schema: name, tid, budget, receiptUrl.
      await addDoc(collection(db, 'sponsors'), {
        companyName: formData.companyName,
        contactName: formData.contactName,
        name: formData.companyName,
        cnic: formData.cnic,
        email: formData.email,
        phone: formData.phone,
        paymentMethod: formData.paymentMethod,
        cardHolderName: formData.cardHolderName,
        cardNumber: formData.cardNumber,
        expiryDate: formData.expiryDate,
        cvv: formData.cvv,
        accountHolderName: formData.accountHolderName,
        mobileNumber: formData.mobileNumber,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        package: selectedPkg.name,
        amount: totalPayable,
        budget: String(Math.round(totalPayable)),
        tid,
        transactionId: tid,
        adUrl: videoUrl || '',
        receiptUrl: videoUrl || '',
        type: 'corporate',
        status: 'pending',
        gateway: 'demo',
        userId: user.uid,
        submittedAt: serverTimestamp(),
      });

      setSuccess(true);
      showToast('Payment successful! Sponsor request submitted for admin review.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error submitting form', 'error');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PaymentSuccessDialog
        amount={totalPayable}
        transactionId={generatedTid}
        paymentMethod={formData.paymentMethod}
        purpose={selectedPkg.name}
        title="Payment successful!"
        message="Your corporate sponsorship payment is confirmed. A sponsor request is pending admin review."
        onAgain={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="p-8 md:p-12 relative">
      {processing && (
        <PaymentProcessingModal amount={totalPayable} method={formData.paymentMethod} />
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 mb-8">
        <AlertCircle className="text-amber-600 mt-1 shrink-0" size={20} />
        <p className="text-sm font-medium text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-900">Guidelines:</span> All ads are reviewed within
          24 hours. Large videos (&gt;50MB) should be shared via Google Drive link.
        </p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
              1
            </div>
            Company Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Company Name"
              icon={<Building2 size={18} />}
              placeholder="Enter company name"
              value={formData.companyName}
              onChange={(v: string) => setFormData({ ...formData, companyName: v })}
            />
            <FormField
              label="Contact Person"
              icon={<User size={18} />}
              placeholder="Full name"
              value={formData.contactName}
              onChange={(v: string) => setFormData({ ...formData, contactName: v })}
            />
            <FormField
              label="Contact CNIC"
              icon={<CreditCard size={18} />}
              placeholder="XXXXX-XXXXXXX-X"
              maxLength={15}
              value={formData.cnic}
              onChange={(v: string) => setFormData({ ...formData, cnic: formatCNIC(v) })}
            />
            <FormField
              label="Business Email"
              icon={<Mail size={18} />}
              placeholder="company@email.com"
              type="email"
              value={formData.email}
              onChange={(v: string) => setFormData({ ...formData, email: v })}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
              2
            </div>
            Ad Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => adInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
            >
              <Upload className="text-slate-400 group-hover:text-emerald-500 mx-auto mb-2" size={24} />
              <p className="text-sm font-bold text-slate-700">
                {adFile ? adFile.name : 'Upload Ad Video/Banner'}
              </p>
              <input
                type="file"
                ref={adInputRef}
                className="hidden"
                onChange={(e) => setAdFile(e.target.files?.[0] || null)}
                accept="video/*,image/*"
              />
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="OR Paste Drive/YouTube Link"
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium"
                  value={formData.videoLink}
                  onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-slate-400 ml-1">
                Use this if your video is larger than 50MB
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
              3
            </div>
            Select Ad Package
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AD_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setFormData({ ...formData, selectedPackageId: pkg.id })}
                className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                  formData.selectedPackageId === pkg.id
                    ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                {formData.selectedPackageId === pkg.id && (
                  <div className="absolute top-2 right-2 text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                )}
                <p
                  className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    formData.selectedPackageId === pkg.id ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {pkg.id}
                </p>
                <p className="font-bold text-slate-900 text-sm mb-1">{pkg.name}</p>
                <p className="text-emerald-600 font-black text-xs">
                  Rs. {pkg.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        <CheckoutPaymentSection
          step={4}
          summaryTitle="Order Summary"
          summaryRows={[
            { label: 'Selected Item:', value: selectedPkg.name },
            { label: 'Subtotal:', value: `Rs. ${subtotal.toLocaleString()}` },
            { label: 'Website Fee (2%):', value: `Rs. ${websiteFee.toLocaleString()}` },
          ]}
          totalLabel="Total Payable:"
          totalAmount={totalPayable}
          paymentMethod={formData.paymentMethod}
          onMethodChange={(method) => setFormData({ ...formData, paymentMethod: method })}
          paymentFields={formData}
          onPaymentFieldChange={(key, value) =>
            setFormData({ ...formData, [key]: applyPaymentFieldChange(key, value) })
          }
          loading={loading}
          submitLabel={`Pay Now (Rs. ${totalPayable.toLocaleString()})`}
        />
      </form>
    </div>
  );
}

type NgoOption = { id: string; name: string };

function SupporterForm({ formatCNIC }: { formatCNIC: (v: string) => string }) {
  const OTHER_NGO = 'Other / NGO Not Listed';

  const [ngoOptions, setNgoOptions] = useState<NgoOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnic: '',
    amount: '1000',
    destination: 'platform',
    selectedNgoId: '',
    selectedNgo: '',
    customNgoName: '',
    customNgoAddress: '',
    paymentMethod: 'Card' as PaymentMethod,
    ...emptyPaymentFields,
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedTid, setGeneratedTid] = useState('');
  const { showToast } = useToast();

  const donationAmount = parseFloat(formData.amount) || 0;

  const purposeLabel =
    formData.destination === 'platform'
      ? 'FreeHunger General Fund'
      : formData.selectedNgoId === OTHER_NGO
        ? formData.customNgoName || 'Custom NGO'
        : ngoOptions.find((n) => n.id === formData.selectedNgoId)?.name || formData.selectedNgo;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Ngos'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          name: (d.data().name as string) || 'Unnamed NGO',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setNgoOptions(list);
      setFormData((prev) => {
        if (prev.selectedNgoId || list.length === 0) return prev;
        return { ...prev, selectedNgoId: list[0].id, selectedNgo: list[0].name };
      });
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (donationAmount <= 0) return showToast('Please enter a valid amount', 'error');
    if (!formData.name.trim() || !formData.email.includes('@')) {
      return showToast('Please complete personal information', 'error');
    }

    const isCustomNgo = formData.selectedNgoId === OTHER_NGO;
    const resolvedNgoName =
      formData.destination === 'platform'
        ? 'FreeHunger Platform'
        : isCustomNgo
          ? formData.customNgoName || 'Custom NGO'
          : ngoOptions.find((n) => n.id === formData.selectedNgoId)?.name || formData.selectedNgo;

    if (formData.destination === 'ngo' && !isCustomNgo && !auth.currentUser) {
      showToast('Please sign in to complete an NGO donation.', 'error');
      return;
    }

    const tid = generateTransactionId();
    setGeneratedTid(tid);
    setProcessing(true);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 2200));

    try {
      await addDoc(collection(db, 'sponsors'), {
        name: formData.name,
        email: formData.email,
        cnic: formData.cnic,
        amount: donationAmount,
        destination: formData.destination,
        selectedNgoId: formData.selectedNgoId,
        selectedNgo: resolvedNgoName,
        customNgoName: formData.customNgoName,
        customNgoAddress: formData.customNgoAddress,
        paymentMethod: formData.paymentMethod,
        cardHolderName: formData.cardHolderName,
        cardNumber: formData.cardNumber,
        expiryDate: formData.expiryDate,
        cvv: formData.cvv,
        accountHolderName: formData.accountHolderName,
        mobileNumber: formData.mobileNumber,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        transactionId: tid,
        type: 'individual',
        status: 'approved',
        gateway: 'demo',
        submittedAt: serverTimestamp(),
      });

      if (
        formData.destination === 'ngo' &&
        formData.selectedNgoId &&
        !isCustomNgo &&
        auth.currentUser
      ) {
        const donationRef = doc(collection(db, 'donations'));
        await setDoc(
          donationRef,
          buildDonationPayload({
            ngoId: formData.selectedNgoId,
            ngoName: resolvedNgoName,
            donorId: auth.currentUser.uid,
            donorName: formData.name || auth.currentUser.displayName || 'Anonymous donor',
            type: 'money',
            amount: donationAmount,
            status: 'pending',
            source: 'individual',
            paymentMethod: formData.paymentMethod,
            transactionId: tid,
            adminNote: 'Awaiting admin review.',
          })
        );
      }

      setSuccess(true);
      showToast('Payment successful!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error submitting', 'error');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PaymentSuccessDialog
        amount={donationAmount}
        transactionId={generatedTid}
        paymentMethod={formData.paymentMethod}
        purpose={purposeLabel}
        title="Payment successful!"
        message="Your donation is confirmed and appears on the NGO Portal and Admin Panel when directed to an NGO."
        onAgain={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="p-8 md:p-12 relative">
      {processing && (
        <PaymentProcessingModal amount={donationAmount} method={formData.paymentMethod} />
      )}

      <form className="space-y-10" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
              1
            </div>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Full Name"
              icon={<User size={18} />}
              placeholder="Enter your name"
              value={formData.name}
              onChange={(v: string) => setFormData({ ...formData, name: v })}
            />
            <FormField
              label="Email"
              icon={<Mail size={18} />}
              placeholder="your@email.com"
              type="email"
              value={formData.email}
              onChange={(v: string) => setFormData({ ...formData, email: v })}
            />
            <FormField
              label="CNIC"
              icon={<CreditCard size={18} />}
              placeholder="XXXXX-XXXXXXX-X"
              maxLength={15}
              value={formData.cnic}
              onChange={(v: string) => setFormData({ ...formData, cnic: formatCNIC(v) })}
            />
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Donation Amount (PKR)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  Rs.
                </div>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
              2
            </div>
            Donation Destination
          </h3>
          <div className="flex gap-4 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, destination: 'platform' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                formData.destination === 'platform'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              FreeHunger Platform
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, destination: 'ngo' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                formData.destination === 'ngo'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Specific NGO
            </button>
          </div>

          {formData.destination === 'ngo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Select NGO
                </label>
                <select
                  value={formData.selectedNgoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const name =
                      id === OTHER_NGO
                        ? OTHER_NGO
                        : ngoOptions.find((n) => n.id === id)?.name || '';
                    setFormData({ ...formData, selectedNgoId: id, selectedNgo: name });
                  }}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium"
                >
                  {ngoOptions.map((ngo) => (
                    <option key={ngo.id} value={ngo.id}>
                      {ngo.name}
                    </option>
                  ))}
                  <option value={OTHER_NGO}>{OTHER_NGO}</option>
                </select>
              </div>
              {formData.selectedNgoId === OTHER_NGO && (
                <div className="space-y-4 contents">
                  <FormField
                    label="NGO Name"
                    icon={<Building2 size={18} />}
                    placeholder="Enter NGO name"
                    value={formData.customNgoName}
                    onChange={(v: string) => setFormData({ ...formData, customNgoName: v })}
                  />
                  <FormField
                    label="NGO Address"
                    icon={<Mail size={18} />}
                    placeholder="NGO location / city"
                    value={formData.customNgoAddress}
                    onChange={(v: string) => setFormData({ ...formData, customNgoAddress: v })}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <CheckoutPaymentSection
          step={3}
          summaryTitle="Donation Summary"
          summaryRows={[{ label: 'Purpose:', value: purposeLabel }]}
          totalLabel="Total Donation:"
          totalAmount={donationAmount}
          paymentMethod={formData.paymentMethod}
          onMethodChange={(method) => setFormData({ ...formData, paymentMethod: method })}
          paymentFields={formData}
          onPaymentFieldChange={(key, value) =>
            setFormData({ ...formData, [key]: applyPaymentFieldChange(key, value) })
          }
          loading={loading}
          submitLabel={`Pay Now (Rs. ${donationAmount.toLocaleString()})`}
        />
      </form>
    </div>
  );
}

/** Shared white checkout panel — matches original Corporate layout. */
function CheckoutPaymentSection({
  step,
  summaryTitle,
  summaryRows,
  totalLabel,
  totalAmount,
  paymentMethod,
  onMethodChange,
  paymentFields,
  onPaymentFieldChange,
  loading,
  submitLabel,
}: {
  step: number;
  summaryTitle: string;
  summaryRows: { label: string; value: string }[];
  totalLabel: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  paymentFields: PaymentFieldsState;
  onPaymentFieldChange: (key: keyof PaymentFieldsState, value: string) => void;
  loading: boolean;
  submitLabel: string;
}) {
  const paymentValid = isPaymentFieldsValid(paymentMethod, paymentFields);
  const fieldErrors = getPaymentFieldErrors(paymentMethod, paymentFields);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">
          {step}
        </div>
        Checkout & Payment
      </h3>

      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              {summaryTitle}
            </h4>
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex justify-between items-start text-sm gap-4">
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span className="text-slate-900 font-bold text-right max-w-[200px]">
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-900 font-black">{totalLabel}</span>
                <span className="text-emerald-600 font-black text-xl">
                  Rs. {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onMethodChange(method)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                      paymentMethod === method
                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              Payment Details
            </h4>
            <div className="space-y-4">
              <PaymentMethodFields
                method={paymentMethod}
                fields={paymentFields}
                errors={fieldErrors}
                onChange={onPaymentFieldChange}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="bg-slate-100/80 p-3 rounded-xl text-[10px] md:text-xs text-slate-600 mb-6 flex items-start gap-2 max-w-2xl mx-auto">
            <span>🛡️</span>
            <p>
              <span className="font-bold">24-Hour Refund Guarantee:</span> If this transaction was
              made by mistake, you can claim a 100% refund from your dashboard within 24 hours.
            </p>
          </div>

          {!paymentValid && !loading && (
            <p className="text-center text-xs text-slate-400 font-medium mb-3">
              Complete all payment fields correctly to enable Pay Now
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !paymentValid}
            className="mx-auto block w-full md:w-auto px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 text-sm shadow-md transition-all text-center flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} /> {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodFields({
  method,
  fields,
  errors,
  onChange,
}: {
  method: PaymentMethod;
  fields: PaymentFieldsState;
  errors: PaymentFieldErrors;
  onChange: (key: keyof PaymentFieldsState, value: string) => void;
}) {
  if (method === 'Card') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
        <FormField
          label="Card Holder Name"
          icon={<User size={18} />}
          placeholder="Name on card"
          value={fields.cardHolderName}
          onChange={(v: string) => onChange('cardHolderName', v)}
          error={errors.cardHolderName}
          autoComplete="cc-name"
          required={false}
        />
        <FormField
          label="Card Number"
          icon={<CreditCard size={18} />}
          placeholder="1234 5678 9012 3456"
          value={fields.cardNumber}
          onChange={(v: string) => onChange('cardNumber', v)}
          error={errors.cardNumber}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={19}
          required={false}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Expiry Date"
            icon={<Hash size={18} />}
            placeholder="MM/YY"
            value={fields.expiryDate}
            onChange={(v: string) => onChange('expiryDate', v)}
            error={errors.expiryDate}
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
            required={false}
          />
          <FormField
            label="CVV"
            icon={<Hash size={18} />}
            placeholder="123"
            value={fields.cvv}
            onChange={(v: string) => onChange('cvv', v)}
            error={errors.cvv}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={3}
            required={false}
          />
        </div>
      </div>
    );
  }

  if (method === 'EasyPaisa' || method === 'JazzCash') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
        <FormField
          label="Account Holder Name"
          icon={<User size={18} />}
          placeholder="Full name"
          value={fields.accountHolderName}
          onChange={(v: string) => onChange('accountHolderName', v)}
          error={errors.accountHolderName}
          required={false}
        />
        <FormField
          label="Mobile Number"
          icon={<Phone size={18} />}
          placeholder="03XX-XXXXXXX"
          value={fields.mobileNumber}
          onChange={(v: string) => onChange('mobileNumber', v)}
          error={errors.mobileNumber}
          inputMode="numeric"
          maxLength={12}
          required={false}
        />
      </div>
    );
  }

  // Bank Transfer
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <FormField
        label="Account Holder Name"
        icon={<User size={18} />}
        placeholder="Full name"
        value={fields.accountHolderName}
        onChange={(v: string) => onChange('accountHolderName', v)}
        error={errors.accountHolderName}
        required={false}
      />
      <FormField
        label="Bank Name"
        icon={<Landmark size={18} />}
        placeholder="e.g. HBL, Meezan"
        value={fields.bankName}
        onChange={(v: string) => onChange('bankName', v)}
        error={errors.bankName}
        required={false}
      />
      <FormField
        label="Account Number / IBAN"
        icon={<Hash size={18} />}
        placeholder="Digits only"
        value={fields.accountNumber}
        onChange={(v: string) => onChange('accountNumber', v)}
        error={errors.accountNumber}
        inputMode="numeric"
        maxLength={MAX_ACCOUNT_DIGITS}
        required={false}
      />
    </div>
  );
}

function PaymentProcessingModal({ amount, method }: { amount: number; method: string }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] max-w-sm w-full p-10 text-center shadow-2xl border border-slate-100">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Processing payment</h3>
        <p className="text-sm text-slate-500 font-medium">
          Rs. {amount.toLocaleString()} via {method}…
        </p>
      </div>
    </div>
  );
}

function PaymentSuccessDialog({
  amount,
  transactionId,
  paymentMethod,
  purpose,
  title,
  message,
  onAgain,
}: {
  amount: number;
  transactionId: string;
  paymentMethod: string;
  purpose: string;
  title: string;
  message: string;
  onAgain: () => void;
}) {
  const { showToast } = useToast();

  const copyTid = async () => {
    try {
      await navigator.clipboard.writeText(transactionId);
      showToast('Transaction ID copied', 'success');
    } catch {
      showToast(transactionId, 'success');
    }
  };

  return (
    <div className="p-12 md:p-16 text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-3">{title}</h2>
      <p className="text-slate-600 mb-2 max-w-md mx-auto font-medium">{message}</p>
      <p className="text-sm text-slate-500 mb-8">
        <span className="font-bold text-slate-800">Rs. {amount.toLocaleString()}</span>
        {' · '}
        {purpose}
        {' · '}
        {paymentMethod}
      </p>

      <div className="max-w-md mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Transaction ID
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono font-bold text-slate-800 bg-white border border-slate-100 rounded-xl px-3 py-2.5 truncate">
            {transactionId}
          </code>
          <button
            type="button"
            onClick={copyTid}
            className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-all"
            aria-label="Copy transaction ID"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onAgain}
        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all inline-flex items-center gap-2"
      >
        <Heart size={16} /> Submit Another
      </button>
    </div>
  );
}

function FormField({
  label,
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
  maxLength,
  error,
  inputMode,
  autoComplete,
  required = true,
}: {
  label: string;
  icon: ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  error?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          type={type}
          required={required}
          value={value}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Block non-numeric keys for numeric-only fields (allow control keys)
            if (inputMode === 'numeric') {
              const allowed = [
                'Backspace',
                'Delete',
                'Tab',
                'ArrowLeft',
                'ArrowRight',
                'Home',
                'End',
              ];
              if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
              if (e.key === '/' && label.toLowerCase().includes('expiry')) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }
          }}
          className={`w-full bg-slate-50 border-0 focus:ring-2 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all ${
            error
              ? 'ring-2 ring-rose-300 focus:ring-rose-400'
              : 'focus:ring-emerald-500'
          }`}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p className="text-[11px] font-medium text-rose-500 ml-1 flex items-center gap-1">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
