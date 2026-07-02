import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useUserRole } from '../lib/useUserRole';
import { joinGroupViaToken, getGroupByInviteToken } from '../lib/groupChat';
import type { GroupChat } from '../lib/groupChat';
import { useToast } from './Toast';

const JoinGroupPage: React.FC = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();

  const [group, setGroup] = useState<GroupChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentUser = auth.currentUser;
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    const loadGroup = async () => {
      if (profileLoading) return;

      if (!inviteToken) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const groupData = await getGroupByInviteToken(inviteToken);
        if (groupData) {
          setGroup(groupData);
        } else {
          setError('Invalid or expired invite link');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [inviteToken, profile, profileLoading]);

  const handleJoin = async () => {
    if (!profile || !isLoggedIn) {
      if (inviteToken) {
        sessionStorage.setItem('pendingGroupJoin', inviteToken);
      }
      showToast('Please log in to join a group', 'error');
      navigate('/login');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      await joinGroupViaToken(inviteToken || '', profile);
      setSuccess(true);
      showToast('Successfully joined group!', 'success');

      // Redirect to group chat after 2 seconds
      setTimeout(() => {
        navigate('/feed');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
      showToast(err.message || 'Failed to join group', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
          <p className="text-slate-300">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-white">Invalid Invite Link</h1>
          <p className="text-slate-300">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
        </div>

        {/* Group Info */}
        {group && (
          <div className="space-y-4 p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              {group.groupPic ? (
                <img
                  src={group.groupPic}
                  alt={group.groupName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-bold text-white">{group.groupName}</h2>
                <p className="text-sm text-slate-300">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-600">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-white">Visibility: </span>
                {group.visibilityScope === 'volunteers' ? 'Volunteers Only' : 'Everyone'}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-300">Success!</p>
              <p className="text-sm text-green-200">Redirecting to group chat...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Status Messages */}
        {!isLoggedIn && (
          <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-sm text-yellow-200">
              Please log in to join this group
            </p>
          </div>
        )}

        {isLoggedIn && profile && group && group.visibilityScope === 'volunteers' && profile.role !== 'volunteer' && profile.role !== 'ngo' && profile.role !== 'admin' && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-200">
              This group is for volunteers only. Your current role ({profile.role}) does not have access.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-slate-600">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  if (inviteToken) {
                    sessionStorage.setItem('pendingGroupJoin', inviteToken);
                  }
                  navigate('/login');
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Log In to Join
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </>
          ) : group && group.members.includes(auth.currentUser?.uid || '') ? (
            <>
              <div className="p-3 bg-green-500/20 rounded-lg text-center">
                <p className="text-sm font-medium text-green-300">
                  You are already a member
                </p>
              </div>
              <button
                onClick={() => navigate('/feed')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Go to Group Chat
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining && <Loader className="w-4 h-4 animate-spin" />}
                {joining ? 'Joining...' : 'Join Group'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinGroupPage;
