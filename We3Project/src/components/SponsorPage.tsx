import { useState, useRef, useEffect } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  Heart
} from 'lucide-react';
import { useToast } from './Toast';

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
                activeTab === 'corporate' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Building2 size={18} /> Corporate
            </button>
            <button
              onClick={() => setActiveTab('supporter')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'supporter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <User size={18} /> Individual
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in">
          {activeTab === 'corporate' ? <CorporateForm formatCNIC={formatCNIC} /> : <SupporterForm formatCNIC={formatCNIC} />}
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
    transactionId: '',
    videoLink: '',
    selectedPackageId: 'starter',
    paymentMethod: 'Card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    walletNumber: ''
  });

  const [adFile, setAdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  
  const adInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const selectedPkg = AD_PACKAGES.find(p => p.id === formData.selectedPackageId) || AD_PACKAGES[0];
  const subtotal = selectedPkg.price;
  const websiteFee = subtotal * 0.02;
  const totalPayable = subtotal + websiteFee;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFile) return showToast('Please upload payment receipt', 'error');
    if (!formData.transactionId) return showToast('Please enter Transaction ID', 'error');
    
    setLoading(true);
    try {
      const receiptBase64 = await fileToBase64(paymentFile);
      let videoUrl = formData.videoLink;
      if (adFile) {
        try {
          const timestamp = Date.now();
          const storageRef = ref(storage, `sponsors/ads/${auth.currentUser?.uid || 'anon'}_${timestamp}_${adFile.name}`);
          const uploadResult = await uploadBytes(storageRef, adFile);
          videoUrl = await getDownloadURL(uploadResult.ref);
        } catch (err) {
          console.error("Storage upload failed", err);
          showToast("Video upload failed. Please provide a link instead.", "error");
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, 'sponsors'), {
        ...formData,
        package: selectedPkg.name,
        amount: totalPayable,
        receiptUrl: receiptBase64,
        adUrl: videoUrl,
        type: 'corporate',
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      setSuccess(true);
      showToast('Application submitted!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error submitting form', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) return <SuccessView />;

  return (
    <div className="p-8 md:p-12">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 mb-8">
        <AlertCircle className="text-amber-600 mt-1 shrink-0" size={20} />
        <p className="text-sm font-medium text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-900">Guidelines:</span> All ads are reviewed within 24 hours. Large videos (&gt;50MB) should be shared via Google Drive link.
        </p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        {/* Company Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">1</div>
            Company Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Company Name" icon={<Building2 size={18} />} placeholder="Enter company name" value={formData.companyName} onChange={(v: string) => setFormData({...formData, companyName: v})} />
            <FormField label="Contact Person" icon={<User size={18} />} placeholder="Full name" value={formData.contactName} onChange={(v: string) => setFormData({...formData, contactName: v})} />
            <FormField label="Contact CNIC" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
            <FormField label="Business Email" icon={<Mail size={18} />} placeholder="company@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
          </div>
        </div>

        {/* Ad Content */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">2</div>
            Ad Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div 
                onClick={() => adInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
              >
                <Upload className="text-slate-400 group-hover:text-emerald-500 mx-auto mb-2" size={24} />
                <p className="text-sm font-bold text-slate-700">{adFile ? adFile.name : 'Upload Ad Video/Banner'}</p>
                <input type="file" ref={adInputRef} className="hidden" onChange={(e) => setAdFile(e.target.files?.[0] || null)} accept="video/*,image/*" />
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="OR Paste Drive/YouTube Link" 
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium"
                    value={formData.videoLink}
                    onChange={(e) => setFormData({...formData, videoLink: e.target.value})}
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">Use this if your video is larger than 50MB</p>
              </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">3</div>
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
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  formData.selectedPackageId === pkg.id ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {pkg.id}
                </p>
                <p className="font-bold text-slate-900 text-sm mb-1">{pkg.name}</p>
                <p className="text-emerald-600 font-black text-xs">Rs. {pkg.price.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Checkout & Payment */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">4</div>
            Checkout & Payment
          </h3>
          
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Order Summary */}
              <div className="space-y-6">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Order Summary</h4>
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Selected Item:</span>
                    <span className="text-slate-900 font-bold">{selectedPkg.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Subtotal:</span>
                    <span className="text-slate-900 font-bold">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Website Fee (2%):</span>
                    <span className="text-slate-900 font-bold">Rs. {websiteFee.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-900 font-black">Total Payable:</span>
                    <span className="text-emerald-600 font-black text-xl">Rs. {totalPayable.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Card', 'EasyPaisa', 'JazzCash'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.paymentMethod === method
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

              {/* Transaction Proof */}
              <div className="space-y-6">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Payment Details</h4>
                <div className="space-y-4">
                  {formData.paymentMethod === 'Card' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <FormField label="Card Number" icon={<CreditCard size={18} />} placeholder="0000 0000 0000 0000" value={formData.cardNumber} onChange={(v: string) => setFormData({...formData, cardNumber: v})} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Expiry Date" icon={<Hash size={18} />} placeholder="MM/YY" value={formData.expiryDate} onChange={(v: string) => setFormData({...formData, expiryDate: v})} />
                        <FormField label="CVV" icon={<Hash size={18} />} placeholder="123" value={formData.cvv} onChange={(v: string) => setFormData({...formData, cvv: v})} />
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <FormField label="Mobile Wallet Number" icon={<Hash size={18} />} placeholder="03xx-xxxxxxx" value={formData.walletNumber} onChange={(v: string) => setFormData({...formData, walletNumber: v})} />
                    </div>
                  )}

                  <FormField label="Transaction ID (TID)" icon={<Hash size={18} />} placeholder="TXN-123456789" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
                  
                  <div 
                    onClick={() => paymentInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group bg-white"
                  >
                    <Upload className="text-slate-300 group-hover:text-emerald-500 mx-auto mb-2 transition-colors" size={24} />
                    <p className="text-xs font-bold text-slate-600">
                      {paymentFile ? <span className="text-emerald-600">Receipt Selected ✅</span> : 'Upload Payment Receipt'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Screenshot or PDF of transaction</p>
                    <input type="file" ref={paymentInputRef} className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="bg-slate-100/80 p-3 rounded-xl text-[10px] md:text-xs text-slate-600 mb-6 flex items-start gap-2 max-w-2xl mx-auto">
                <span>🛡️</span>
                <p><span className="font-bold">24-Hour Refund Guarantee:</span> If this transaction was made by mistake, you can claim a 100% refund from your dashboard within 24 hours.</p>
              </div>

              <button 
                disabled={loading}
                className="mx-auto block w-full md:w-auto px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 text-sm shadow-md transition-all text-center flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Pay & Place Ad Order (Rs. {totalPayable.toLocaleString()})</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function SupporterForm({ formatCNIC }: { formatCNIC: (v: string) => string }) {
  const OTHER_NGO = 'Other / NGO Not Listed';

  const [ngoOptions, setNgoOptions] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnic: '',
    transactionId: '',
    amount: '1000',
    destination: 'platform',
    selectedNgoId: '',
    selectedNgo: '',
    customNgoName: '',
    customNgoAddress: '',
    paymentMethod: 'Card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    walletNumber: ''
  });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const donationAmount = parseFloat(formData.amount) || 0;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Ngos'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, name: (d.data().name as string) || 'Unnamed NGO' }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setNgoOptions(list);
      setFormData((prev) => {
        if (prev.selectedNgoId || list.length === 0) return prev;
        return { ...prev, selectedNgoId: list[0].id, selectedNgo: list[0].name };
      });
    });
    return () => unsub();
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFile) return showToast('Please upload receipt', 'error');
    if (!formData.transactionId) return showToast('Please enter Transaction ID', 'error');
    if (donationAmount <= 0) return showToast('Please enter a valid amount', 'error');
    
    setLoading(true);
    try {
      const receiptBase64 = await fileToBase64(paymentFile);
      const isCustomNgo = formData.selectedNgoId === OTHER_NGO;
      const resolvedNgoName = isCustomNgo
        ? (formData.customNgoName || 'Custom NGO')
        : (ngoOptions.find((n) => n.id === formData.selectedNgoId)?.name || formData.selectedNgo);

      await addDoc(collection(db, 'sponsors'), {
        ...formData,
        selectedNgo: resolvedNgoName,
        amount: donationAmount,
        receiptUrl: receiptBase64,
        type: 'individual',
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      // Direct/manual NGO donations appear on NGO Portal as Under Review
      if (formData.destination === 'ngo' && formData.selectedNgoId && !isCustomNgo) {
        if (!auth.currentUser) {
          showToast('Sign in so this donation is linked to the NGO Portal.', 'error');
        } else {
          await addDoc(
            collection(db, 'donations'),
            buildDonationPayload({
              ngoId: formData.selectedNgoId,
              ngoName: resolvedNgoName,
              donorId: auth.currentUser.uid,
              donorName: formData.name || auth.currentUser.displayName || 'Anonymous donor',
              type: 'money',
              amount: donationAmount,
              status: 'under_review',
              source: 'individual',
              receiptUrl: receiptBase64,
              paymentMethod: formData.paymentMethod,
              transactionId: formData.transactionId,
            })
          );
        }
      }

      setSuccess(true);
      showToast('Donation submitted!', 'success');
    } catch (err) {
      showToast('Error submitting', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) return <SuccessView />;

  return (
    <div className="p-8 md:p-12">
      <form className="space-y-10" onSubmit={handleSubmit}>
        {/* Personal Info */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">1</div>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Full Name" icon={<User size={18} />} placeholder="Enter your name" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} />
            <FormField label="Email" icon={<Mail size={18} />} placeholder="your@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
            <FormField label="CNIC" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Donation Amount (PKR)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</div>
                <input 
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Donation Destination */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">2</div>
            Donation Destination
          </h3>
          <div className="flex gap-4 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, destination: 'platform' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                formData.destination === 'platform' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              FreeHunger Platform
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, destination: 'ngo' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                formData.destination === 'ngo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Specific NGO
            </button>
          </div>

          {formData.destination === 'ngo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select NGO</label>
                <select
                  value={formData.selectedNgoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const name =
                      id === OTHER_NGO
                        ? OTHER_NGO
                        : (ngoOptions.find((n) => n.id === id)?.name || '');
                    setFormData({ ...formData, selectedNgoId: id, selectedNgo: name });
                  }}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 px-4 text-sm font-medium"
                >
                  {ngoOptions.map((ngo) => (
                    <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                  ))}
                  <option value={OTHER_NGO}>{OTHER_NGO}</option>
                </select>
              </div>
              {formData.selectedNgoId === OTHER_NGO && (
                <div className="space-y-4 contents">
                  <FormField label="NGO Name" icon={<Building2 size={18} />} placeholder="Enter NGO name" value={formData.customNgoName} onChange={(v: string) => setFormData({...formData, customNgoName: v})} />
                  <FormField label="NGO Address" icon={<Mail size={18} />} placeholder="NGO location / city" value={formData.customNgoAddress} onChange={(v: string) => setFormData({...formData, customNgoAddress: v})} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkout & Payment */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">3</div>
            Checkout & Payment
          </h3>
          
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Order Summary */}
              <div className="space-y-6">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Donation Summary</h4>
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-slate-500 font-medium">Purpose:</span>
                    <span className="text-slate-900 font-bold text-right max-w-[200px]">
                      {formData.destination === 'platform'
                        ? 'FreeHunger General Fund'
                        : (formData.selectedNgoId === OTHER_NGO
                          ? formData.customNgoName || 'Custom NGO'
                          : (ngoOptions.find((n) => n.id === formData.selectedNgoId)?.name || formData.selectedNgo))}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-900 font-black">Total Donation:</span>
                    <span className="text-emerald-600 font-black text-xl">Rs. {donationAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Card', 'EasyPaisa', 'JazzCash'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.paymentMethod === method
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

              {/* Transaction Proof */}
              <div className="space-y-6">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Payment Details</h4>
                <div className="space-y-4">
                  {formData.paymentMethod === 'Card' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <FormField label="Card Number" icon={<CreditCard size={18} />} placeholder="0000 0000 0000 0000" value={formData.cardNumber} onChange={(v: string) => setFormData({...formData, cardNumber: v})} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Expiry Date" icon={<Hash size={18} />} placeholder="MM/YY" value={formData.expiryDate} onChange={(v: string) => setFormData({...formData, expiryDate: v})} />
                        <FormField label="CVV" icon={<Hash size={18} />} placeholder="123" value={formData.cvv} onChange={(v: string) => setFormData({...formData, cvv: v})} />
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <FormField label="Mobile Wallet Number" icon={<Hash size={18} />} placeholder="03xx-xxxxxxx" value={formData.walletNumber} onChange={(v: string) => setFormData({...formData, walletNumber: v})} />
                    </div>
                  )}

                  <FormField label="Transaction ID (TID)" icon={<Hash size={18} />} placeholder="TXN-XXXXX" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
                  
                  <div 
                    onClick={() => paymentInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group bg-white"
                  >
                    <Upload className="text-slate-300 group-hover:text-emerald-500 mx-auto mb-2 transition-colors" size={24} />
                    <p className="text-xs font-bold text-slate-600">
                      {paymentFile ? <span className="text-emerald-600">Receipt Selected ✅</span> : 'Upload Payment Receipt'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Screenshot of transaction</p>
                    <input type="file" ref={paymentInputRef} className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} accept="image/*" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <div className="bg-slate-100/80 p-3 rounded-xl text-[10px] md:text-xs text-slate-600 mb-6 flex items-start gap-2 max-w-2xl mx-auto text-left">
                <span>🛡️</span>
                <p><span className="font-bold">24-Hour Refund Guarantee:</span> If this transaction was made by mistake, you can claim a 100% refund from your dashboard within 24 hours.</p>
              </div>

              <button 
                disabled={loading}
                className="mx-auto block w-full md:w-auto px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 text-sm shadow-md transition-all text-center flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Heart size={18} /> Complete Donation (Rs. {donationAmount.toLocaleString()})</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="p-20 text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">Submission Received!</h2>
      <p className="text-slate-600 mb-8">Thank you for your support. Our team will verify your transaction and update your status within 24 hours.</p>
      <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">Submit Another</button>
    </div>
  );
}

function FormField({ label, icon, placeholder, value, onChange, type = "text", maxLength }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        <input 
          type={type}
          required
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
