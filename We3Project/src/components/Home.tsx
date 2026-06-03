import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Stars, Heart, ShieldCheck, SortDesc, Trophy } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import VolunteerMap from './VolunteerMap';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Particle Background Logic
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId = 0;
    const particleCount = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number;
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas!.width) this.x = 0;
        if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        if (this.y < 0) this.y = canvas!.height;
      }
      draw() {
        ctx!.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationFrameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    init();

    // 2. GSAP Animations
    const ctx_gsap = gsap.context(() => {
      // Hero animations
      gsap.from('.hero-content > *', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      });

      gsap.from('.hero-image-box', {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 0.5
      });

      // Scroll animations
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((elem) => {
        gsap.from(elem, {
          scrollTrigger: {
            trigger: elem,
            start: 'top 85%',
          },
          y: 50,
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        });
      });
    }, containerRef);

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      ctx_gsap.revert();
    };
  }, []);

  const stats = [
    { label: 'Meals Served', value: '150,000+' },
    { label: 'NGOs & Schools', value: '20+' },
    { label: 'Active Donors', value: '3,400+' },
    { label: 'Credits Earned', value: '500,000+' },
  ];

  return (
    <div className="flex flex-col min-h-screen" ref={containerRef}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-emerald-50/50">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 hero-content">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
                <Stars size={16} /> Pakistan's First Ad-to-Donation Platform
              </span>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                Watch Ads.<br />
                Earn Credits.<br />
                <span className="text-emerald-500">Feed Children.</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                No money needed. Watch short ads, earn real credits, and donate
                to verified NGOs & rural schools across Pakistan — all for free.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/login" className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200">
                  <PlayCircle size={24} />
                  Start Earning to Donate
                </Link>
              </div>
            </div>

            <div className="lg:w-1/2 relative hero-image-box">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="Children"
                  className="w-full aspect-[4/3] object-cover"
                />
                
                {/* Floating Cards */}
                <div className="absolute top-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">🍽️</div>
                  <div>
                    <div className="font-black text-emerald-600 text-sm">150,000+</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Meals Served</div>
                  </div>
                </div>

                <div className="absolute bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-2xl">🏫</div>
                  <div>
                    <div className="font-black text-orange-500 text-sm">20+</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">NGOs & Schools</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-slate-100 reveal">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <h3 className="text-3xl font-black text-slate-900 mb-1">{stat.value}</h3>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NGO Map Section */}
      <div className="reveal">
        <VolunteerMap />
      </div>

      {/* How It Works */}
      <section className="py-24 bg-slate-50" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <h2 className="text-4xl font-black text-slate-900 mb-4">How FreeHunger Works</h2>
            <p className="text-lg text-slate-600">Three simple steps. Zero cost to you. Real impact.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: '📱', title: 'Create an Account', desc: 'Sign up in 30 seconds with email or Google.' },
              { step: 2, icon: '📺', title: 'Watch Short Ads', desc: 'Each 30-second video earns you Rs. 10.' },
              { step: 3, icon: '❤️', title: 'Donate to NGOs', desc: 'Use your credits to donate to verified NGOs.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center reveal group transition-all hover:shadow-xl">
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
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Why FreeHunger?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Heart className="text-emerald-500" />, title: 'Zero Cost', desc: 'Never spend a rupee.' },
              { icon: <ShieldCheck className="text-orange-500" />, title: 'Verified', desc: '100% vetted NGOs.' },
              { icon: <SortDesc className="text-purple-500" />, title: 'Smart', desc: 'Urgent needs first.' },
              { icon: <Trophy className="text-red-500" />, title: 'Gamified', desc: 'Earn badges & streaks.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl border border-slate-100 reveal">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">{f.icon}</div>
                <h5 className="text-xl font-bold mb-3">{f.title}</h5>
                <p className="text-slate-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-emerald-600 text-white text-center reveal">
        <h2 className="text-4xl font-black mb-6">Start Helping Today</h2>
        <Link to="/login" className="inline-block bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl">
          Create Free Account
        </Link>
      </section>
    </div>
  );
};

export default Home;
