import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Heart, Send, User, Mail, Phone, MapPin, Briefcase, MessageSquare, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from './Toast';

export default function VolunteerForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    interests: 'food_distribution',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSuccess] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'volunteers'), {
        ...formData,
        userId: auth.currentUser?.uid || 'anonymous',
        submittedAt: serverTimestamp()
      });
      setSuccess(true);
      showToast('Application sent successfully!', 'success');
    } catch (error) {
      console.error('Error adding document: ', error);
      showToast('Error sending application. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Application Received!</h2>
          <p className="text-slate-600 mb-8">Thank you for your interest in volunteering. Our team will review your application and contact you soon via email.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setSuccess(false)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              Send Another Application
            </button>
            <Link 
              to="/feed"
              className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Left Info Panel */}
          <div className="md:col-span-2 bg-emerald-600 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/20">
                <Heart size={24} />
              </div>
              <h2 className="text-3xl font-black mb-4">Join Our Mission</h2>
              <p className="text-emerald-50 text-sm leading-relaxed opacity-90">
                We're looking for passionate individuals to help us distribute food, 
                organize events, and spread awareness across Pakistan.
              </p>
            </div>

            <div className="relative z-10 mt-12 space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Office</div>
                  <div className="text-sm font-bold">Karachi, Pakistan</div>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Email</div>
                  <div className="text-sm font-bold">volunteer@freehunger.org</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-3 p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                      placeholder="+92 3XX XXXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Current City</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all"
                      placeholder="e.g. Karachi"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Area of Interest</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all appearance-none"
                    value={formData.interests}
                    onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  >
                    <option value="food_distribution">Food Distribution</option>
                    <option value="fundraising">Fundraising & Events</option>
                    <option value="awareness">Awareness & Social Media</option>
                    <option value="tech_support">Tech Support / Data Entry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Why do you want to join? (Short Bio)</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea 
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium transition-all resize-none"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <Send size={20} />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
