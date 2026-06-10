import { useState, useRef } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Upload, 
  ShieldCheck, 
  AlertCircle, 
  Building, 
  MapPin, 
  Hash,
  Send,
  Package,
  Loader2,
  Video,
  CheckCircle2
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
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    cnic: '',
    email: '',
    phone: '',
    budget: '10000',
    transactionId: '',
    videoLink: ''
  });

  const [adFile, setAdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  
  const adInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

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
    
    setLoading(true);
    try {
      // 1. Convert Receipt to Base64 (Bypasses Storage/CORS)
      const receiptBase64 = await fileToBase64(paymentFile);

      // 2. Handle Video (Large file -> Firebase Storage)
      let videoUrl = formData.videoLink;
      if (adFile) {
        try {
          const timestamp = Date.now();
          const storageRef = ref(storage, `sponsors/ads/${auth.currentUser?.uid || 'anon'}_${timestamp}_${adFile.name}`);
          const uploadResult = await uploadBytes(storageRef, adFile);
          videoUrl = await getDownloadURL(uploadResult.ref);
        } catch (err) {
          console.error("Storage upload failed, falling back to manual link requirement", err);
          showToast("Video upload failed due to network. Please provide a Drive link instead.", "error");
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, 'sponsors'), {
        ...formData,
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

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Company Name" icon={<Building2 size={18} />} placeholder="Enter company name" value={formData.companyName} onChange={(v: string) => setFormData({...formData, companyName: v})} />
          <FormField label="Contact Person" icon={<User size={18} />} placeholder="Full name" value={formData.contactName} onChange={(v: string) => setFormData({...formData, contactName: v})} />
          <FormField label="Contact CNIC" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
          <FormField label="Business Email" icon={<Mail size={18} />} placeholder="company@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
        </div>

        {/* Ad Assets */}
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ad Content</label>
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

        {/* Payment */}
        <div className="space-y-6 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField label="Transaction ID (TID)" icon={<Hash size={18} />} placeholder="TXN-123456789" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
            <div 
                onClick={() => paymentInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <Upload className="text-slate-400 mx-auto mb-2" size={20} />
                <p className="text-xs font-bold text-slate-700">{paymentFile ? 'Receipt Selected ✅' : 'Upload Payment Receipt'}</p>
                <input type="file" ref={paymentInputRef} className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} accept="image/*" />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /> Submit Application</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function SupporterForm({ formatCNIC }: { formatCNIC: (v: string) => string }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnic: '',
    transactionId: ''
  });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  const paymentInputRef = useRef<HTMLInputElement>(null);

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
    
    setLoading(true);
    try {
      const receiptBase64 = await fileToBase64(paymentFile);
      await addDoc(collection(db, 'sponsors'), {
        ...formData,
        receiptUrl: receiptBase64,
        type: 'individual',
        status: 'pending',
        submittedAt: serverTimestamp()
      });
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
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Full Name" icon={<User size={18} />} placeholder="Enter your name" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} />
          <FormField label="Email" icon={<Mail size={18} />} placeholder="your@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
          <FormField label="CNIC" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
          <FormField label="Transaction ID" icon={<Hash size={18} />} placeholder="TXN-XXXXX" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
        </div>
        
        <div 
          onClick={() => paymentInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer"
        >
          <Upload className="text-slate-400 mx-auto mb-3" size={32} />
          <p className="font-bold text-slate-700">{paymentFile ? paymentFile.name : 'Click to upload payment screenshot'}</p>
          <input type="file" ref={paymentInputRef} className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} accept="image/*" />
        </div>

        <button disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" size={24} /> : <><Heart size={20} /> Complete Donation</>}
        </button>
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
