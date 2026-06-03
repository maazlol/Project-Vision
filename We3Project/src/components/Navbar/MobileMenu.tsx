import NavLink from './NavLink';
import UserActions from './UserActions';

interface MobileMenuProps {
  isOpen: boolean;
  navLinks: { name: string; path: string }[];
  setIsOpen: (isOpen: boolean) => void;
}

const MobileMenu = ({ isOpen, navLinks, setIsOpen }: MobileMenuProps) => {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden mt-2 py-4 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col space-y-1">
      {navLinks.map((link) => (
        <NavLink
          key={link.path}
          name={link.name}
          path={link.path}
          mobile
          onClick={() => setIsOpen(false)}
        />
      ))}
      <UserActions mobile onAction={() => setIsOpen(false)} />
    </div>
  );
};

export default MobileMenu;
