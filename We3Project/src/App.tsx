import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Feed from './components/Feed';
import VolunteerForm from './components/VolunteerForm';
import SponsorPage from './components/SponsorPage';
import { useEffect } from 'react';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Hide Navbar/Footer for Login page if desired, 
  // but for consistency with original app, we can keep them 
  // or use a conditional check.
  const isAuthPage = location.pathname === '/login';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900">
      {!isAuthPage && <Navbar />}
      
      <main key={location.pathname} className="flex-grow animate-fade-in">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/feed" element={
            <div className="pt-16"> {/* Spacer for fixed navbar */}
              <div className="bg-emerald-600 text-white py-8 md:py-10">
                <div className="container mx-auto px-4">
                  <div className="max-w-3xl space-y-3">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Impact Feed</h1>
                    <p className="text-emerald-50 text-lg opacity-90 max-w-2xl">See real impact stories, share your progress, and inspire donors and volunteers to keep giving back.</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-white text-emerald-600 shadow-xl transition-all">
                        Community Feed
                      </button>
                      <button onClick={() => navigate('/volunteer')} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-emerald-700/50 text-emerald-100 hover:bg-emerald-700 transition-all">
                        Volunteer
                      </button>
                    </div>
                  </div>

                </div>
              </div>
              <Feed />
            </div>
          } />
          <Route path="/volunteer" element={<div className="pt-24 pb-20 container mx-auto px-4"><VolunteerForm /></div>} />
          <Route path="/about" element={<div className="pt-32 pb-20 container mx-auto px-4"><h1 className="text-4xl font-black">About Us</h1><p className="mt-4 text-slate-600">FreeHunger is a community-driven platform...</p></div>} />
          <Route path="/news" element={<div className="pt-32 pb-20 container mx-auto px-4"><h1 className="text-4xl font-black">Latest News</h1><p className="mt-4 text-slate-600">Stay updated with our impact stories...</p></div>} />
          <Route path="/blog" element={<div className="pt-32 pb-20 container mx-auto px-4"><h1 className="text-4xl font-black">Blog</h1><p className="mt-4 text-slate-600">Read our latest articles on social change...</p></div>} />
          <Route path="/sponsor" element={<SponsorPage />} />
          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
