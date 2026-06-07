import { useState, useRef } from 'react';
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
  Package
} from 'lucide-react';

export default function SponsorPage() {
  const [activeTab, setActiveTab] = useState<'corporate' | 'supporter'>('corporate');

  // Shared CNIC formatter
  const formatCNIC = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 5) return val;
    if (val.length <= 12) return `${val.slice(0, 5)}-${val.slice(5)}`;
    return `${val.slice(0, 5)}-${val.slice(5, 12)}-${val.slice(12, 13)}`;
  };

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Support <span className="text-emerald-600">FreeHunger</span>
          </h1>
          <p className="text-slate-600 font-medium max-w-2xl mx-auto">
            Join our mission to end hunger in Pakistan. Choose how you want to make an impact today.
          </p>
        </div>

        {/* Custom Tabs / Pills */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
            <button
              onClick={() => setActiveTab('corporate')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'corporate' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Building2 size={18} />
              Corporate Sponsor
            </button>
            <button
              onClick={() => setActiveTab('supporter')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'supporter' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <User size={18} />
              Normal Supporter
            </button>
          </div>
        </div>

        {/* Form Container */}
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
    transactionId: ''
  });

  const [adFile, setAdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  
  const adInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-8 md:p-12">
      {/* Guidelines Alert */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 mb-8">
        <AlertCircle className="text-slate-400 mt-1 shrink-0" size={20} />
        <p className="text-sm font-medium text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-900">Guidelines:</span> No NSFW content, no gambling promotions, and no political ads allowed on this platform.
        </p>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Company Name" icon={<Building size={18} />} placeholder="Enter company name" value={formData.companyName} onChange={(v: string) => setFormData({...formData, companyName: v})} />
          <FormField label="Contact Person Name" icon={<User size={18} />} placeholder="Full name" value={formData.contactName} onChange={(v: string) => setFormData({...formData, contactName: v})} />
          <FormField label="Contact CNIC" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
          <FormField label="Business Email" icon={<Mail size={18} />} placeholder="company@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
          <FormField label="Phone Number" icon={<Phone size={18} />} placeholder="+92 3XX XXXXXXX" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} />
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Budget Tier</label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all appearance-none"
              >
                <option value="10000">10,000 PKR Package</option>
                <option value="50000">50,000 PKR Package</option>
                <option value="100000">1 Lakh+ PKR Premium</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ad Assets Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ad Banners / Video Creatives</label>
          <input 
            type="file" 
            ref={adInputRef}
            className="hidden"
            onChange={(e) => setAdFile(e.target.files?.[0] || null)}
            accept="video/*,image/*"
          />
          <div 
            onClick={() => adInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload className="text-slate-400 group-hover:text-emerald-500" size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {adFile ? `File Selected: ${adFile.name}` : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-slate-400 mt-1">MP4, PNG, JPG or GIF (Max 50MB)</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Direct Payment Details</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Phone size={16} />
                  </div>
                  <p className="text-sm font-black text-slate-900">Mobile Wallet</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-bold">EasyPaisa Account:</span> 03XX-XXXXXXX<br/>
                  <span className="font-bold">Title:</span> FreeHunger Support
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Building size={16} />
                  </div>
                  <p className="text-sm font-black text-slate-900">Bank Transfer</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-bold">Meezan Bank</span> | <span className="font-bold">Title:</span> FreeHunger Foundation<br/>
                  <span className="font-bold">Account:</span> 1234-56789-0123-45<br/>
                  <span className="font-bold">IBAN:</span> PK00MEZN000001234567890
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField label="Transaction ID (TID)" icon={<Hash size={18} />} placeholder="TXN-123456789" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Upload Payment Screenshot / Receipt (PNG, JPG)</label>
              <input 
                type="file" 
                ref={paymentInputRef}
                className="hidden"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                accept="image/*"
              />
              <div 
                onClick={() => paymentInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
              >
                <Upload className="text-slate-400 group-hover:text-emerald-500 mx-auto mb-2" size={20} />
                <p className="text-[11px] font-bold text-slate-700">
                  {paymentFile ? `Screenshot: ${paymentFile.name}` : 'Click to upload screenshot'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between pt-2">
            <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 flex-1">
              <ShieldCheck size={16} className="shrink-0" />
              🛡️ 24-Hour Payback Guarantee: If submitted by mistake, contact support within 24 hours for a manual refund.
            </p>
            <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 whitespace-nowrap">
              <Send size={20} />
              Submit Corporate Application
            </button>
          </div>
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
    whereToDonate: 'platform',
    specificNgo: 'Saylani',
    ngoNotListed: false,
    customNgoName: '',
    ngoLocation: '',
    transactionId: ''
  });

  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-8 md:p-12">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Full Name" icon={<User size={18} />} placeholder="Enter your name" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} />
          <FormField label="Email Address" icon={<Mail size={18} />} placeholder="your@email.com" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
          <FormField label="CNIC / National ID" icon={<CreditCard size={18} />} placeholder="XXXXX-XXXXXXX-X" maxLength={15} value={formData.cnic} onChange={(v: string) => setFormData({...formData, cnic: formatCNIC(v)})} />
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Where to Donate</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={formData.whereToDonate}
                onChange={(e) => setFormData({...formData, whereToDonate: e.target.value})}
                className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all appearance-none"
              >
                <option value="platform">Donate to Platform Campaign</option>
                <option value="ngo">Donate to a Specific NGO</option>
              </select>
            </div>
          </div>
        </div>

        {formData.whereToDonate === 'ngo' && (
          <div className="space-y-4 animate-slide-in-top">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select NGO</label>
              <div className="relative">
                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={formData.specificNgo}
                  onChange={(e) => setFormData({...formData, specificNgo: e.target.value})}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all appearance-none"
                  disabled={formData.ngoNotListed}
                >
                  <option value="Saylani">Saylani Welfare Trust</option>
                  <option value="Edhi">Edhi Foundation</option>
                  <option value="Chhipa">Chhipa Welfare</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <input 
                type="checkbox" 
                checked={formData.ngoNotListed}
                onChange={(e) => setFormData({...formData, ngoNotListed: e.target.checked})}
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">NGO not listed</span>
            </label>

            {formData.ngoNotListed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-slide-in-top">
                <FormField label="Custom NGO Name" icon={<Building2 size={18} />} placeholder="Enter NGO name" value={formData.customNgoName} onChange={(v: string) => setFormData({...formData, customNgoName: v})} />
                <FormField label="NGO Location Address" icon={<MapPin size={18} />} placeholder="Area/City" value={formData.ngoLocation} onChange={(v: string) => setFormData({...formData, ngoLocation: v})} />
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Direct Payment Details</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Phone size={16} />
                  </div>
                  <p className="text-sm font-black text-slate-900">Mobile Wallet</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-bold">EasyPaisa Account:</span> 03XX-XXXXXXX<br/>
                  <span className="font-bold">Title:</span> FreeHunger Support
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Building size={16} />
                  </div>
                  <p className="text-sm font-black text-slate-900">Bank Transfer</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-bold">Meezan Bank</span> | <span className="font-bold">Title:</span> FreeHunger Foundation<br/>
                  <span className="font-bold">Account:</span> 1234-56789-0123-45<br/>
                  <span className="font-bold">IBAN:</span> PK00MEZN000001234567890
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField label="Transaction ID (TID)" icon={<Hash size={18} />} placeholder="TXN-123456789" value={formData.transactionId} onChange={(v: string) => setFormData({...formData, transactionId: v})} />
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Upload Payment Screenshot / Receipt (PNG, JPG)</label>
              <input 
                type="file" 
                ref={paymentInputRef}
                className="hidden"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                accept="image/*"
              />
              <div 
                onClick={() => paymentInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
              >
                <Upload className="text-slate-400 group-hover:text-emerald-500 mx-auto mb-2" size={20} />
                <p className="text-[11px] font-bold text-slate-700">
                  {paymentFile ? `Screenshot: ${paymentFile.name}` : 'Click to upload screenshot'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between pt-2">
            <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 flex-1">
              <ShieldCheck size={16} className="shrink-0" />
              🛡️ 24-Hour Payback Guarantee: If submitted by mistake, contact support within 24 hours for a manual refund.
            </p>
            <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 whitespace-nowrap">
              <Send size={20} />
              Complete Donation
            </button>
          </div>
        </div>
      </form>
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
