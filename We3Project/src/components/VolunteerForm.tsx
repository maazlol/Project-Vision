import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { 
  Heart, User, Mail, Phone, MapPin, 
  MessageSquare, Loader2, CheckCircle2, ArrowLeft, 
  CreditCard, Camera as LucideCamera, Upload, 
  Check, AlertCircle, Clock, XCircle,
  ShieldCheck
} from 'lucide-react';
import { useToast } from './Toast';

const STEPS = [
  { title: 'Personal', icon: User },
  { title: 'Identity', icon: CreditCard },
  { title: 'Verification', icon: LucideCamera }
];

export default function VolunteerForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnic: '',
    city: '',
    interests: 'food_distribution',
    bio: ''
  });

  const [files, setFiles] = useState<{
    cnicFront: File | null;
    cnicBack: File | null;
    selfie: File | null;
  }>({
    cnicFront: null,
    cnicBack: null,
    selfie: null
  });

  const [previews, setPreviews] = useState<{
    cnicFront: string | null;
    cnicBack: string | null;
    selfie: string | null;
  }>({
    cnicFront: null,
    cnicBack: null,
    selfie: null
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSuccess] = useState(false);
  const { showToast } = useToast();

  const cnicFrontInputRef = useRef<HTMLInputElement>(null);
  const cnicBackInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!auth.currentUser) {
        setCheckingExisting(false);
        return;
      }
      try {
        const q = query(collection(db, 'volunteers'), where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setExistingApplication({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
        }
      } catch (err) {
        console.error("Error checking application status:", err);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkStatus();
  }, []);

  const formatCNIC = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 5) return val;
    if (val.length <= 12) return `${val.slice(0, 5)}-${val.slice(5)}`;
    return `${val.slice(0, 5)}-${val.slice(5, 12)}-${val.slice(12, 13)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof files) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      setFiles(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    if (currentStep === 0) {
      return (
        formData.name.trim().length >= 3 && 
        formData.email.includes('@') && 
        formData.phone.length >= 10 && 
        formData.city.trim().length >= 3 && 
        formData.bio.trim().length >= 10
      );
    }
    if (currentStep === 1) {
      return formData.cnic.length === 15 && files.cnicFront && files.cnicBack;
    }
    if (currentStep === 2) {
      return files.selfie;
    }
    return false;
  };

  const handleNameChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z\s]/g, '');
    setFormData({ ...formData, name: cleaned });
  };

  const handleCityChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z\s]/g, '');
    setFormData({ ...formData, city: cleaned });
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/[^\d+]/g, '');
    setFormData({ ...formData, phone: cleaned });
  };

  const checkDuplicateCNIC = async (cnic: string) => {
    const q = query(collection(db, 'volunteers'), where('cnic', '==', cnic));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
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
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          }, 'image/jpeg', 0.7);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    try {
      const isDuplicate = await checkDuplicateCNIC(formData.cnic);
      if (isDuplicate) {
        showToast('This CNIC is already registered.', 'error');
        setLoading(false);
        return;
      }
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
      const [cnicFrontBase64, cnicBackBase64, selfieBase64] = await Promise.all([
        compressAndConvert(files.cnicFront),
        compressAndConvert(files.cnicBack),
        compressAndConvert(files.selfie),
      ]);
      await addDoc(collection(db, 'volunteers'), {
        ...formData,
        cnicFront: cnicFrontBase64,
        cnicBack: cnicBackBase64,
        selfie: selfieBase64,
        status: 'pending',
        userId: userId,
        submittedAt: serverTimestamp()
      });
      setSuccess(true);
      showToast('Application sent successfully!', 'success');
    } catch (error: any) {
      console.error('Submission error:', error);
      showToast('Error sending application.', 'error');
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
        <Link to="/feed" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-emerald-50 transition-all">
            <ArrowLeft size={18} />
          </div>
          Back to Feed
        </Link>
        <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-emerald-100 animate-zoom-in">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
            status === 'rejected' ? 'bg-rose-100 text-rose-600' :
            'bg-amber-100 text-amber-600'
          }`}>
            {status === 'approved' && <CheckCircle2 size={40} />}
            {status === 'rejected' && <XCircle size={40} />}
            {status === 'pending' && <Clock size={40} />}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">{status.toUpperCase()} Verification</h2>
          <p className="text-slate-600 mb-8">Status: {status}</p>
          <Link to="/feed" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">Go to Feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/feed" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors group">
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
                <Heart size={24} />
              </div>
              <h2 className="text-3xl font-black mb-4">KYC Verification</h2>
              <div className="mt-12 space-y-8">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = currentStep === idx;
                  const isCompleted = currentStep > idx;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isActive ? 'bg-white text-emerald-600 border-white scale-110 shadow-lg' : 
                        isCompleted ? 'bg-emerald-500 text-white border-emerald-500' : 
                        'bg-transparent text-emerald-200 border-emerald-400/30'
                      }`}>
                        {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                      </div>
                      <div className={isActive ? 'font-bold' : 'opacity-60 text-sm'}>
                        <div className="text-[10px] uppercase tracking-widest font-black mb-0.5">Step {idx + 1}</div>
                        <div className="text-sm">{step.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative z-10 mt-12 pt-8 border-t border-white/10 flex items-center gap-3 text-emerald-100/60">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Encrypted & Secure</span>
            </div>
          </div>
          <div className="md:col-span-3 p-10">
            {currentStep === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" required value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all" placeholder="As per CNIC" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all" placeholder="your@email.com" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="tel" required value={formData.phone} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all" placeholder="+92 3XX XXXXXXX" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" required value={formData.city} onChange={(e) => handleCityChange(e.target.value)} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all" placeholder="e.g. Karachi" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bio</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea rows={3} value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all resize-none" placeholder="Tell us about yourself..." />
                  </div>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CNIC Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" required value={formData.cnic} onChange={(e) => setFormData({...formData, cnic: formatCNIC(e.target.value)})} className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all" placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div onClick={() => cnicFrontInputRef.current?.click()} className={`relative aspect-[1.6/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer ${previews.cnicFront ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {previews.cnicFront ? <img src={previews.cnicFront} className="w-full h-full object-cover" /> : <Upload size={20} />}
                    <input type="file" ref={cnicFrontInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cnicFront')} />
                  </div>
                  <div onClick={() => cnicBackInputRef.current?.click()} className={`relative aspect-[1.6/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer ${previews.cnicBack ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {previews.cnicBack ? <img src={previews.cnicBack} className="w-full h-full object-cover" /> : <Upload size={20} />}
                    <input type="file" ref={cnicBackInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cnicBack')} />
                  </div>
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in text-center">
                <div onClick={() => selfieInputRef.current?.click()} className={`relative aspect-square max-w-[280px] mx-auto rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer ${previews.selfie ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  {previews.selfie ? <img src={previews.selfie} className="w-full h-full object-cover" /> : <LucideCamera size={32} />}
                  <input type="file" ref={selfieInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} />
                </div>
                <div className="bg-amber-50 p-4 rounded-xl flex gap-3 text-left">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-xs text-amber-800">Hold your CNIC next to your face clearly.</p>
                </div>
              </div>
            )}
            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 0 && <button onClick={() => setCurrentStep(prev => prev - 1)} className="text-slate-400 font-bold">Previous</button>}
              {currentStep < 2 ? (
                <button onClick={() => validateStep() ? setCurrentStep(prev => prev + 1) : showToast('Fill all fields', 'error')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold ml-auto">Next Step</button>
              ) : (
                <button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black ml-auto disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Finish & Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
