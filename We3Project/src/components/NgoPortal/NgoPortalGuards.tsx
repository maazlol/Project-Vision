import { Link as RouterLink } from 'react-router-dom';
import { Building2, Loader2, Lock } from 'lucide-react';

export function NgoPortalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-24">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
    </div>
  );
}

export function NgoAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 pt-24">
      <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Access Denied</h2>
        <p className="text-slate-500 mb-8 font-medium">
          This portal is only available to NGO accounts.
        </p>
        <RouterLink
          to="/"
          className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          Return to Home
        </RouterLink>
      </div>
    </div>
  );
}

export function NgoNotLinked() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 pt-24">
      <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">NGO Not Linked</h2>
        <p className="text-slate-500 mb-8 font-medium">
          Your account does not have an NGO profile linked yet. An admin must set{' '}
          <code className="text-xs bg-slate-100 px-2 py-1 rounded">ownerUid</code> on your{' '}
          <code className="text-xs bg-slate-100 px-2 py-1 rounded">Ngos</code> document.
        </p>
        <RouterLink
          to="/"
          className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          Return to Home
        </RouterLink>
      </div>
    </div>
  );
}
