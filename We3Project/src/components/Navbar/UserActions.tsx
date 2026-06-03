import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { Settings, LogOut } from 'lucide-react';
import { useUserRole } from '../../lib/useUserRole';

interface UserActionsProps {
  mobile?: boolean;
  onAction?: () => void;
}

const UserActions = ({ mobile, onAction }: UserActionsProps) => {
  const { profile: userData, loading } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onAction) onAction();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  if (loading) return null;

  if (!userData) {
    return (
      <Link
        to="/login"
        onClick={onAction}
        className={mobile 
          ? "mx-4 mt-2 bg-emerald-500 text-white px-4 py-3 rounded-xl text-center font-bold"
          : "bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors"
        }
      >
        Login
      </Link>
    );
  }

  if (mobile) {
    return (
      <div className="mx-4 mt-2 pt-4 border-t border-gray-100 flex flex-col gap-2">
        <Link 
          to="/settings" 
          onClick={onAction}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700"
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden xl:flex flex-column items-end">
        <span className="font-bold text-xs text-gray-800 leading-none">
          {userData.username || userData.displayName?.split(' ')[0] || 'User'}
        </span>
        <span className="text-[10px] text-emerald-500 font-semibold">
          Rs. {(userData.credits || 0).toLocaleString()}
        </span>
      </div>
      
      {userData.avatarType === 'image' && userData.avatarValue ? (
        <img src={userData.avatarValue} className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover" alt="avatar" />
      ) : userData.avatarType === 'emoji' ? (
        <div 
          className="w-9 h-9 rounded-full border-2 border-emerald-500 flex items-center justify-center text-lg"
          style={{ backgroundColor: userData.avatarBg || '#f3f4f6' }}
        >
          {userData.avatarValue || '😊'}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
          {getInitials(userData.displayName || userData.email)}
        </div>
      )}

      <Link to="/settings" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all hover:rotate-45" title="Settings">
        <Settings size={18} />
      </Link>
      
      <button 
        onClick={handleLogout}
        className="flex items-center justify-center w-9 h-9 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
};

export default UserActions;
