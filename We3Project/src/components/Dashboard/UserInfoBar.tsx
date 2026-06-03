import { Coins, Flame, Heart } from 'lucide-react';
import { useUserRole } from '../../lib/useUserRole';

const UserInfoBar = () => {
  const { profile: userData, loading } = useUserRole();

  if (loading) return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100 animate-pulse h-32">
    </div>
  );

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 bg-emerald-50 flex items-center justify-center text-3xl overflow-hidden">
            {userData?.avatarType === 'image' && userData?.avatarValue ? (
              <img src={userData.avatarValue} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <span className="flex items-center justify-center w-full h-full">
                {userData?.avatarValue || '😊'}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Welcome back</p>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {userData?.username || userData?.name || 'User'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">{userData?.city || 'Pakistan'}</p>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Credits Balance</p>
            <h3 className="text-xl font-black text-emerald-600">Rs. {(userData?.credits || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Daily Streak</p>
            <h3 className="text-xl font-black text-orange-500">{userData?.streak || 0} Days</h3>
          </div>
        </div>

        <div className="bg-rose-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
            <Heart size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Donated</p>
            <h3 className="text-xl font-black text-rose-500">Rs. {(userData?.totalDonated || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoBar;
