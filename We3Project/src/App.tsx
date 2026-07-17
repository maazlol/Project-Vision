import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Feed from './components/Feed';
import VolunteerForm from './components/VolunteerForm';
import NgoRegisterForm from './components/NgoRegisterForm';
import SponsorPage from './components/SponsorPage';
import AdminPanel from './components/AdminPanel';
import NgoDashboard from './components/NgoPortal/NgoDashboard';
import TransactionHistory from './components/NgoPortal/TransactionHistory';
import NgoProfile from './components/NgoPortal/NgoProfile';
import MessagesPage from './components/MessagesPage';
import JoinGroupPage from './components/JoinGroupPage';
import Blog from './components/Blog';
import News from './components/News';
import Article from './components/Article';
import About from './components/About';
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
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/ngo-portal" element={<NgoDashboard />} />
          <Route path="/ngo-portal/history" element={<TransactionHistory />} />
          <Route path="/ngo-portal/profile" element={<NgoProfile />} />
          <Route path="/discussions" element={<MessagesPage />} />
          <Route path="/discussions/:discussionId" element={<MessagesPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:discussionId" element={<MessagesPage />} />
          <Route path="/chat/join/:inviteToken" element={<JoinGroupPage />} />
          <Route path="/groups/join/:inviteToken" element={<JoinGroupPage />} />
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
                      <button onClick={() => navigate('/ngo-register')} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-emerald-700/50 text-emerald-100 hover:bg-emerald-700 transition-all">
                        NGO Register
                      </button>
                    </div>
                  </div>

                </div>
              </div>
              <Feed />
            </div>
          } />
          <Route path="/volunteer" element={<div className="pt-24 pb-20 container mx-auto px-4"><VolunteerForm /></div>} />
          <Route path="/ngo-register" element={<div className="pt-24 pb-20 container mx-auto px-4"><NgoRegisterForm /></div>} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Article />} />
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
