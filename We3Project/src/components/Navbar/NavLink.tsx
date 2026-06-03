import { Link, useLocation } from 'react-router-dom';

interface NavLinkProps {
  name: string;
  path: string;
  onClick?: () => void;
  mobile?: boolean;
}

const NavLink = ({ name, path, onClick, mobile }: NavLinkProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const active = isActive(path);

  if (mobile) {
    return (
      <Link
        to={path}
        onClick={onClick}
        className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
          active ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {name}
      </Link>
    );
  }

  return (
    <Link
      to={path}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-600 ${
        active ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-700'
      }`}
    >
      {name}
    </Link>
  );
};

export default NavLink;
