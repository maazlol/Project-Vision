import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Send,
  Users,
  X,
  Settings,
  Plus,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';
import {
  sendGroupMessage,
  backfillGroupInviteMappings,
  createCustomGroupChat,
  generateGroupInviteLink,
  type GroupChat,
  type GroupMessage,
} from '../lib/groupChat';
import GroupInfoModal from './GroupInfoModal';

interface GroupChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  } catch {
    return '';
  }
};

const GroupChatDrawer: React.FC<GroupChatDrawerProps> = ({ isOpen, onClose }) => {
  // State
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupMessagesLoading, setGroupMessagesLoading] = useState(false);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [isGroupSending, setIsGroupSending] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedGroupData, setSelectedGroupData] = useState<GroupChat | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showInviteLink, setShowInviteLink] = useState<string | null>(null);

  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserUid = auth.currentUser?.uid;

  // Load groups
  useEffect(() => {
    if (!isOpen || profileLoading) return;

    if (!profile) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const nextGroups = snapshot.docs
          .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }) as GroupChat)
          .sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.lastMessageAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });

        setGroups(nextGroups);
        setGroupsLoading(false);
        backfillGroupInviteMappings(nextGroups, profile.uid);
      },
      (error) => {
        console.error('Groups error:', error);
        setGroupsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, profile, profileLoading]);

  // Load group messages
  useEffect(() => {
    if (!isOpen || !selectedGroupId) {
      setGroupMessages([]);
      return;
    }

    setGroupMessagesLoading(true);
    const messagesQuery = query(
      collection(db, 'groups', selectedGroupId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setGroupMessages(
          snapshot.docs.map((messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          })) as GroupMessage[]
        );
        setGroupMessagesLoading(false);
      },
      (error) => {
        console.error('Group messages error:', error);
        setGroupMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, selectedGroupId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  // Handle send message
  const handleGroupSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const messageText = groupMessageText.trim();
    if (!profile || !selectedGroupId || !messageText || isGroupSending) return;

    setGroupMessageText('');
    setIsGroupSending(true);
    try {
      await sendGroupMessage(selectedGroupId, profile, messageText);
    } catch (error) {
      console.error('Send group message error:', error);
      setGroupMessageText(messageText);
      showToast('Failed to send message.', 'error');
    } finally {
      setIsGroupSending(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async () => {
    if (!profile || !newGroupName.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const groupId = await createCustomGroupChat(profile, {
        groupName: newGroupName,
        visibilityScope: 'all',
      });
      showToast('Group created successfully!', 'success');
      setNewGroupName('');
      setShowCreateModal(false);
      setSelectedGroupId(groupId);
    } catch (error: any) {
      console.error('Create group error:', error);
      showToast(error.message || 'Failed to create group', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Handle copy invite link
  const handleCopyInviteLink = (group: GroupChat) => {
    const link = generateGroupInviteLink(group.inviteToken);
    navigator.clipboard.writeText(link);
    setCopiedLink(group.id);
    showToast('Invite link copied!', 'success');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[820px] bg-white shadow-2xl transition-transform duration-300 overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* SIDEBAR - Groups List */}
        <div className="flex h-full flex-col md:grid md:grid-cols-[300px_1fr]">
          {/* Mobile Header with Tabs */}
          <div className="flex flex-col md:hidden border-b border-gray-200">
            <div className="flex h-16 items-center justify-between px-5">
              <div>
                <h2 className="text-lg font-black text-gray-950">Group Chats</h2>
                <p className="text-xs font-medium text-gray-500">Your groups</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex flex-col border-r border-gray-200">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
              <div>
                <h2 className="text-lg font-black text-gray-950">Group Chats</h2>
                <p className="text-xs font-medium text-gray-500">Your groups</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-y-auto">
              {groupsLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                  Loading groups...
                </div>
              ) : !profile ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <AlertCircle size={28} className="mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-900">Sign in required</h3>
                  <p className="mt-1 text-sm text-gray-500">Login to join groups.</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <MessageCircle size={28} className="mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-900">No groups yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Create or join a group to get started.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create Group
                  </button>
                </div>
              ) : (
                <>
                  {groups.map((group) => {
                    const isActive = selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 ${
                          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                          {group.groupPic ? (
                            <img src={group.groupPic} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white">
                              <Users size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-950">{group.groupName}</p>
                          <p className="truncate text-xs text-gray-500">
                            {group.lastMessage || `${group.members.length} members`}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Create Group Button */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full m-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Group
                  </button>
                </>
              )}
            </div>
          </div>

          {/* MAIN CHAT AREA - Desktop */}
          <div className="hidden md:flex h-full flex-col">
            {!selectedGroupId || !selectedGroup ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Users size={48} className="mb-3 text-gray-300" />
                <h3 className="text-lg font-black text-gray-900">Select a group</h3>
                <p className="mt-1 text-sm text-gray-500">Your chat will open here.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shrink-0">
                      {selectedGroup.groupPic ? (
                        <img src={selectedGroup.groupPic} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white">
                          <Users size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-gray-950">{selectedGroup.groupName}</h3>
                      <p className="text-xs font-medium text-gray-500">
                        {selectedGroup.members.length} member
                        {selectedGroup.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowInviteLink(selectedGroup.id);
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                      title="Share Link"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGroupData(selectedGroup);
                        setShowGroupInfo(true);
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                      title="Group Info"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </header>

                {/* Invite Link Display */}
                {showInviteLink === selectedGroup.id && (
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                    <div className="flex items-center gap-2 justify-between">
                      <input
                        type="text"
                        value={generateGroupInviteLink(selectedGroup.inviteToken)}
                        readOnly
                        className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1"
                      />
                      <button
                        onClick={() => handleCopyInviteLink(selectedGroup)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        {copiedLink === selectedGroup.id ? (
                          <>
                            <Check size={16} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">
                  {groupMessagesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                      Loading messages...
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageCircle size={34} className="mb-3 text-gray-300" />
                      <h3 className="font-black text-gray-900">No messages yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupMessages.map((message) => {
                        const isMe = message.senderId === currentUserUid;
                        return (
                          <div key={message.id} className={`flex min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[78%] min-w-0 flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {!isMe && (
                                <span className="mb-1 px-1 text-[11px] font-bold text-gray-500">
                                  {message.senderName}
                                </span>
                              )}
                              <div
                                className={`max-w-full min-w-0 overflow-hidden rounded-3xl px-4 py-2 text-sm leading-6 ${
                                  isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                  {message.text}
                                </p>
                              </div>
                              <span className="mt-1 px-1 text-[10px] font-medium text-gray-400">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleGroupSend} className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 focus-within:border-gray-400">
                    <input
                      type="text"
                      value={groupMessageText}
                      onChange={(e) => setGroupMessageText(e.target.value)}
                      placeholder="Message..."
                      disabled={isGroupSending}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                    />
                    <button
                      type="submit"
                      disabled={!groupMessageText.trim() || isGroupSending}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* MOBILE VIEW - Combined */}
          <div className="md:hidden flex-1 flex flex-col">
            {!selectedGroupId || !selectedGroup ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <MessageCircle size={40} className="mb-3 text-gray-300" />
                <h3 className="text-lg font-black text-gray-900">Select a group</h3>
                <p className="mt-2 text-sm text-gray-500">Choose a group to start chatting</p>

                {/* Groups List for Mobile */}
                <div className="w-full mt-6 space-y-2 max-h-80 overflow-y-auto">
                  {groups.length === 0 ? (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Create Group
                    </button>
                  ) : (
                    <>
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                            {group.groupPic ? (
                              <img src={group.groupPic} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white">
                                <Users size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-950">{group.groupName}</p>
                            <p className="truncate text-xs text-gray-500">{group.members.length} members</p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Create Group
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Chat Header */}
                <div className="shrink-0 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <button onClick={() => setSelectedGroupId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} className="text-gray-500" />
                  </button>
                  <h3 className="font-black text-gray-950">{selectedGroup.groupName}</h3>
                  <button
                    onClick={() => {
                      setSelectedGroupData(selectedGroup);
                      setShowGroupInfo(true);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  >
                    <Settings size={18} />
                  </button>
                </div>

                {/* Mobile Chat Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">
                  {groupMessagesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Loading...
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-gray-500">
                      <p>No messages yet. Start chatting!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupMessages.map((message) => {
                        const isMe = message.senderId === currentUserUid;
                        return (
                          <div key={message.id} className={`flex min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] min-w-0 overflow-hidden rounded-3xl px-4 py-2 text-sm ${
                                isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {!isMe && <p className="text-xs mb-1 opacity-70">{message.senderName}</p>}
                              <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                {message.text}
                              </p>
                              <p className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Mobile Chat Input */}
                <form onSubmit={handleGroupSend} className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2">
                    <input
                      type="text"
                      value={groupMessageText}
                      onChange={(e) => setGroupMessageText(e.target.value)}
                      placeholder="Message..."
                      disabled={isGroupSending}
                      className="flex-1 border-0 bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                    />
                    <button
                      type="submit"
                      disabled={!groupMessageText.trim() || isGroupSending}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Create Group Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Group</h2>
              <input
                type="text"
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Group Info Modal */}
      {selectedGroupData && (
        <GroupInfoModal
          isOpen={showGroupInfo}
          group={selectedGroupData}
          members={[]}
          currentUserUid={currentUserUid || ''}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdated={() => {
            setShowGroupInfo(false);
            setSelectedGroupId(null);
          }}
        />
      )}
    </>
  );
};

export default GroupChatDrawer;
