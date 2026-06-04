import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Stars, Heart, ShieldCheck, SortDesc, Trophy, BadgeCheck, Sparkles } from 'lucide-react';
import VolunteerMap from './VolunteerMap';

const Home = () => {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const stats = [
    { label: 'Meals Served', value: 150000, suffix: '+', icon: Heart, tone: 'from-emerald-500 to-green-500' },
    { label: 'NGOs & Schools', value: 20, suffix: '+', icon: BadgeCheck, tone: 'from-lime-500 to-emerald-500' },
    { label: 'Active Donors', value: 3400, suffix: '+', icon: Sparkles, tone: 'from-teal-500 to-emerald-500' },
    { label: 'Credits Earned', value: 500000, suffix: '+', icon: Trophy, tone: 'from-emerald-600 to-green-500' },
  ];

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const nextCounts = stats.reduce<Record<number, number>>((acc, stat, index) => {
        acc[index] = Math.floor(stat.value * eased);
        return acc;
      }, {});

      setCounts(nextCounts);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const formatValue = (value: number, suffix: string) => `${value.toLocaleString()}${suffix}`;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-emerald-50/50 pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-12">
            <div className="w-full text-center lg:w-1/2 lg:text-left hero-content">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 mb-6">
                <Stars size={16} /> Pakistan's First Ad-to-Donation Platform
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                Watch Ads.<br />
                Earn Credits.<br />
                <span className="text-emerald-500">Feed Children.</span>
              </h1>
              <p className="mx-auto max-w-lg text-base text-slate-600 sm:text-lg lg:mx-0 mb-8">
                No money needed. Watch short ads, earn real credits, and donate
                to verified NGOs & rural schools across Pakistan — all for free.
              </p>
              <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 sm:w-auto sm:px-8 sm:text-lg">
                  <PlayCircle size={24} />
                  Start Earning to Donate
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-1/2 hero-image-box">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="Children"
                  className="aspect-[4/3] w-full object-cover"
                />

                {/* Floating Cards */}
                <div className="absolute left-3 top-3 flex max-w-[180px] items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:left-[-1rem] sm:top-6 sm:max-w-none sm:p-4 lg:left-[-1.5rem]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 text-xl text-white">🍽️</div>
                  <div>
                    <div className="text-sm font-black text-emerald-600 sm:text-sm">150,000+</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Meals Served</div>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 flex max-w-[180px] items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6 sm:right-[-1rem] sm:max-w-none sm:p-4 lg:right-[-1.5rem]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-lime-500 to-emerald-500 text-xl text-white">🏫</div>
                  <div>
                    <div className="text-sm font-black text-orange-500 sm:text-sm">20+</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">NGOs & Schools</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <article key={i} className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-100 p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.tone} text-white shadow-sm`}>
                      <Icon size={18} />
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Live</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1 sm:text-3xl">{formatValue(counts[i] ?? 0, stat.suffix)}</h3>
                  <p className="text-xs font-semibold text-slate-600 sm:text-sm">{stat.label}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* NGO Map Section */}
      <VolunteerMap />

      {/* How It Works */}
      <section className="py-24 bg-slate-50" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">How FreeHunger Works</h2>
            <p className="text-lg text-slate-600">Three simple steps. Zero cost to you. Real impact.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { step: 1, icon: '📱', title: 'Create an Account', desc: 'Sign up in 30 seconds with email or Google.' },
              { step: 2, icon: '📺', title: 'Watch Short Ads', desc: 'Each 30-second video earns you Rs. 10.' },
              { step: 3, icon: '❤️', title: 'Donate to NGOs', desc: 'Use your credits to donate to verified NGOs.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black mb-6 mx-auto">
                  {item.step}
                </div>
                <div className="text-5xl mb-6">{item.icon}</div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h4>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Why FreeHunger?</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: <Heart className="text-emerald-500" />, title: 'Zero Cost', desc: 'Never spend a rupee.' },
              { icon: <ShieldCheck className="text-orange-500" />, title: 'Verified', desc: '100% vetted NGOs.' },
              { icon: <SortDesc className="text-purple-500" />, title: 'Smart', desc: 'Urgent needs first.' },
              { icon: <Trophy className="text-red-500" />, title: 'Gamified', desc: 'Earn badges & streaks.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-emerald-50/40 hover:border-emerald-200 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">{f.icon}</div>
                <h5 className="text-xl font-bold mb-3">{f.title}</h5>
                <p className="text-slate-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-emerald-600 text-white text-center">
        <h2 className="text-4xl font-black mb-6">Start Helping Today</h2>
        <Link to="/login" className="inline-block bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl">
          Create Free Account
        </Link>
      </section>
    </div>
  );
};

export default Home;
