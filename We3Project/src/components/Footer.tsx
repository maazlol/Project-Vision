import { Link } from 'react-router-dom';
import { Globe, Share2, Camera, Users, RotateCcw } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-gray-300 py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          <div>
            <div className="text-2xl font-extrabold text-white mb-4">
              FreeHunger
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A platform dedicated to ending hunger through community,
              technology and small acts of kindness.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-colors" title="Facebook">
                <Globe size={18} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-colors" title="Twitter">
                <Share2 size={18} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-colors" title="Instagram">
                <Camera size={18} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-colors" title="Linkedin">
                <Users size={18} />
              </a>
            </div>
          </div>

          <div className="lg:ml-auto">
            <h5 className="text-white font-bold mb-6">Quick Links</h5>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link></li>
              <li><Link to="/feed" className="hover:text-emerald-500 transition-colors">Feed</Link></li>
              <li><Link to="/dashboard" className="hover:text-emerald-500 transition-colors">ViewToHelp</Link></li>
              <li><Link to="/news" className="hover:text-emerald-500 transition-colors">News</Link></li>
              <li><Link to="/blog" className="hover:text-emerald-500 transition-colors">Blog</Link></li>
              <li><Link to="/sponsor" className="hover:text-emerald-500 transition-colors">Sponsor</Link></li>
              <li><Link to="/about" className="hover:text-emerald-500 transition-colors">About</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Support</h5>
            <ul className="space-y-3 text-sm">
              <li><a href="/#how-it-works" className="hover:text-emerald-500 transition-colors">How It Works</a></li>
              <li><Link to="/sponsor" className="hover:text-emerald-500 transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Terms of Use</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Monthly Reset</h5>
            <p className="text-gray-400 text-sm mb-4">
              NGO rankings reset every month to ensure fair distribution of donations.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-emerald-100 text-sm">
              <RotateCcw size={18} className="text-emerald-500" />
              <span>Next reset in <strong>14 days</strong></span>
            </div>
          </div>

        </div>

        <hr className="my-10 border-slate-800" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2026 FreeHunger. All rights reserved. Credits in PKR.</p>
          <p>Made with care for Pakistan</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
