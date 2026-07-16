import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import NavBrand from './Navbar/NavBrand';
import NavLink from './Navbar/NavLink';
import UserActions from './Navbar/UserActions';
import MobileMenu from './Navbar/MobileMenu';
import { useUserRole } from '../lib/useUserRole';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { profile } = useUserRole();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Feed', path: '/feed' },
    { name: 'ViewToHelp', path: '/dashboard' },
    { name: 'News', path: '/news' },
    { name: 'Blog', path: '/blog' },
    { name: 'Sponsor', path: '/sponsor' },
    { name: 'About', path: '/about' },
  ];

  // Role-specific portal links
  if (profile?.role === 'ngo') {
    navLinks.push({ name: 'NGO', path: '/ngo-portal' });
  }
  if (profile?.role === 'admin') {
    navLinks.push({ name: 'Admin', path: '/admin' });
  }

  return (
    <nav className={`fixed-top transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-white py-3'}`} id="mainNav">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <NavBrand />

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <NavLink key={link.path} name={link.name} path={link.path} />
            ))}

            <div className="ml-4 flex items-center gap-3">
              <UserActions />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        <MobileMenu isOpen={isOpen} navLinks={navLinks} setIsOpen={setIsOpen} />
      </div>
    </nav>
  );
};

export default Navbar;
