import React, { useEffect, useState } from 'react';
import {
  X,
  Shield,
  Trash2,
  Copy,
  RotateCcw,
  LogOut,
  Image as ImageIcon,
  Users,
  Edit2,
} from 'lucide-react';
import type { GroupChat, GroupMember } from '../lib/groupChat';
import {
  updateGroupName,
  updateGroupPic,
  makeUserAdmin,
  removeUserFromGroup,
  leaveGroup,
  regenerateInviteToken,
  generateGroupInviteLink,
} from '../lib/groupChat';
import { useToast } from './Toast';

interface GroupInfoModalProps {
  isOpen: boolean;
  group: GroupChat | null;
  members: GroupMember[];
  currentUserUid: string;
  onClose: () => void;
  onGroupUpdated?: () => void;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  group,
  members,
  currentUserUid,
  onClose,
  onGroupUpdated,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [editingPic, setEditingPic] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPicUrl, setNewPicUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (group) {
      setNewName(group.groupName);
      setNewPicUrl(group.groupPic);
      setInviteToken(group.inviteToken);
    }
  }, [group]);

  if (!isOpen || !group) return null;

  const isCurrentUserAdmin = group.admins.includes(currentUserUid);
  const inviteLink = generateGroupInviteLink(inviteToken || group.inviteToken);

  const handleSaveName = async () => {
    if (!newName.trim()) {
      showToast('Group name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateGroupName(group.id, newName, currentUserUid);
      showToast('Group name updated successfully', 'success');
      setEditingName(false);
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to update group name', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePic = async () => {
    if (!newPicUrl.trim()) {
      showToast('Group picture URL cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateGroupPic(group.id, newPicUrl, currentUserUid);
      showToast('Group picture updated successfully', 'success');
      setEditingPic(false);
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to update group picture', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    showToast('Invite link copied to clipboard', 'success');
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm('Are you sure? The old invite link will stop working.')) {
      return;
    }

    setLoading(true);
    try {
      const newToken = await regenerateInviteToken(group.id, currentUserUid);
      setInviteToken(newToken);
      showToast('Invite link regenerated', 'success');
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to regenerate invite link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    setLoading(true);
    try {
      await makeUserAdmin(group.id, memberId, currentUserUid);
      showToast('Member promoted to admin', 'success');
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to promote member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setLoading(true);
    try {
      await removeUserFromGroup(group.id, memberId, currentUserUid);
      showToast('Member removed from group', 'success');
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    setLoading(true);
    try {
      await leaveGroup(group.id, currentUserUid);
      showToast('Left group successfully', 'success');
      onClose();
      onGroupUpdated?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to leave group', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div
          className="w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
            <h2 className="text-xl font-bold text-white">Group Info</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Group Header Section */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Group Picture */}
              <div className="flex-shrink-0">
                {editingPic ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Enter image URL"
                      value={newPicUrl}
                      onChange={(e) => setNewPicUrl(e.target.value)}
                      className="w-24 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSavePic}
                      disabled={loading}
                      className="w-24 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    {newPicUrl ? (
                      <img
                        src={newPicUrl}
                        alt={group.groupName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-slate-700"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {isCurrentUserAdmin && (
                      <button
                        onClick={() => setEditingPic(true)}
                        className="mt-2 p-1.5 hover:bg-slate-800 rounded-full transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Group Name and Info */}
              <div className="flex-1">
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Group name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white">{newName}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Visibility: {group.visibilityScope === 'volunteers' ? 'Volunteers Only' : 'Everyone'}
                      </p>
                    </div>
                    {isCurrentUserAdmin && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Invite Link Section */}
            {members.find(m => m.uid === currentUserUid) && (
              <div className="space-y-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Invite Link
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
                {isCurrentUserAdmin && (
                  <button
                    onClick={handleRegenerateToken}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Regenerate Link
                  </button>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({members.length})
              </h4>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {member.displayName}
                          </p>
                          {member.isAdmin && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          {member.uid === currentUserUid && (
                            <span className="text-xs text-slate-400">(You)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                    </div>

                    {/* Member Actions */}
                    {isCurrentUserAdmin && member.uid !== currentUserUid && (
                      <div className="flex items-center gap-1">
                        {!member.isAdmin && (
                          <button
                            onClick={() => handleMakeAdmin(member.uid)}
                            disabled={loading}
                            title="Make Admin"
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Shield className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(member.uid)}
                          disabled={loading}
                          title="Remove Member"
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Group Button */}
            {members.find(m => m.uid === currentUserUid) && (
              <button
                onClick={handleLeaveGroup}
                disabled={loading}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupInfoModal;
