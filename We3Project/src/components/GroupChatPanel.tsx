import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  Plus,
  Send,
  X,
  Settings,
  Users,
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';
import GroupInfoModal from './GroupInfoModal';
import {
  sendGroupMessage,
  getUserGroups,
  createCustomGroupChat,
  type GroupChat,
  type GroupMember,
  type GroupMessage,
  getGroupWithMembers,
} from '../lib/groupChat';

interface GroupChatPanelProps {
  isOpen: boolean;
  groupId?: string | null;
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

const GroupChatPanel: React.FC<GroupChatPanelProps> = ({
  isOpen,
  groupId,
  onClose,
}) => {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupVisibility, setNewGroupVisibility] = useState<'all' | 'volunteers'>('all');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserUid = auth.currentUser?.uid;

  // Load user's groups
  useEffect(() => {
    if (!isOpen || !currentUserUid || profileLoading) return;

    setGroupsLoading(true);
    const loadGroups = async () => {
      try {
        const userGroups = await getUserGroups(currentUserUid);
        setGroups(userGroups.sort((a, b) => {
          const aTime = a.lastMessageAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.lastMessageAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        }));
      } catch (error) {
        console.error('Error loading groups:', error);
        showToast('Failed to load groups', 'error');
      } finally {
        setGroupsLoading(false);
      }
    };

    loadGroups();
  }, [isOpen, currentUserUid, profileLoading, refreshTrigger]);

  // Set selected group
  useEffect(() => {
    if (groupId && groups.length > 0) {
      const group = groups.find(g => g.id === groupId);
      if (group) setSelectedGroup(group);
    } else if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, groupId, selectedGroup]);

  // Load messages for selected group
  useEffect(() => {
    if (!isOpen || !selectedGroup || !currentUserUid) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const messagesQuery = query(
      collection(db, 'groups', selectedGroup.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const loadedMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        })) as GroupMessage[];
        setMessages(loadedMessages);
        setMessagesLoading(false);
      },
      (error) => {
        console.error('Error loading messages:', error);
        showToast('Failed to load messages', 'error');
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, selectedGroup, currentUserUid]);

  // Load members for selected group
  useEffect(() => {
    if (!selectedGroup) return;

    const loadMembers = async () => {
      try {
        const memberProfiles: Record<string, any> = {};

        // Fetch user profiles for all members
        for (const memberId of selectedGroup.members) {
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
              memberProfiles[memberId] = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching profile for ${memberId}:`, error);
          }
        }

        const { members: loadedMembers } = await getGroupWithMembers(
          selectedGroup.id,
          memberProfiles
        );
        setMembers(loadedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };

    loadMembers();
  }, [selectedGroup, refreshTrigger]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedGroup || !messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendGroupMessage(selectedGroup.id, profile, messageText);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleGroupUpdated = () => {
    setRefreshTrigger(t => t + 1);
    setShowInfoModal(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isCreatingGroup) return;
    if (!newGroupName.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const newGroupId = await createCustomGroupChat(profile, {
        groupName: newGroupName,
        visibilityScope: newGroupVisibility,
      });
      const groupDoc = await getDoc(doc(db, 'groups', newGroupId));
      if (groupDoc.exists()) {
        const newGroup = { id: groupDoc.id, ...groupDoc.data() } as GroupChat;
        setSelectedGroup(newGroup);
      }
      setNewGroupName('');
      setNewGroupVisibility('all');
      setShowCreateModal(false);
      setRefreshTrigger(t => t + 1);
      showToast('Group created', 'success');
    } catch (error: any) {
      console.error('Error creating group:', error);
      showToast(error.message || 'Failed to create group', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-4xl bg-slate-900 shadow-2xl transition-transform duration-300">
        <div className="grid h-full grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Groups List Sidebar */}
          <div className="hidden md:flex flex-col bg-slate-950 border-r border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Groups
              </h2>
              <div className="flex items-center gap-1">
                {profile && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Create group"
                    aria-label="Create group"
                  >
                    <Plus className="w-5 h-5 text-blue-400" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-y-auto">
              {groupsLoading ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  Loading groups...
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  <p>No groups yet</p>
                  {profile && (
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Group
                    </button>
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full p-3 text-left border-b border-slate-800 transition-colors hover:bg-slate-800 ${
                      selectedGroup?.id === group.id ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {group.groupPic ? (
                        <img
                          src={group.groupPic}
                          alt={group.groupName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate text-sm">
                          {group.groupName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {group.lastMessage || 'No messages yet'}
                        </p>
                        {group.lastMessageAt && (
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTime(group.lastMessageAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-col bg-slate-900">
            {/* Chat Header */}
            {selectedGroup ? (
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedGroup.groupPic ? (
                    <img
                      src={selectedGroup.groupPic}
                      alt={selectedGroup.groupName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">
                      {selectedGroup.groupName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Group Info"
                  >
                    <Settings className="w-5 h-5 text-slate-400 hover:text-white" />
                  </button>
                  <button
                    onClick={onClose}
                    className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <p className="text-slate-400">No group selected</p>
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 text-center">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.senderId === currentUserUid;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex gap-2 max-w-xs lg:max-w-md ${
                          isCurrentUser ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {message.senderAvatar && !isCurrentUser && (
                          <img
                            src={message.senderAvatar}
                            alt={message.senderName}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div
                          className={`flex flex-col ${
                            isCurrentUser ? 'items-end' : 'items-start'
                          }`}
                        >
                          {!isCurrentUser && (
                            <p className="text-xs text-slate-400 mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl break-words ${
                              isCurrentUser
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-white rounded-bl-none'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedGroup && (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={isSending}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* Group Info Modal */}
      {selectedGroup && (
        <GroupInfoModal
          isOpen={showInfoModal}
          group={selectedGroup}
          members={members}
          currentUserUid={currentUserUid || ''}
          onClose={() => setShowInfoModal(false)}
          onGroupUpdated={handleGroupUpdated}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Create Group</h3>
                <p className="text-xs text-slate-400">Start your own group chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Example: Volunteer Team"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                  Privacy
                </label>
                <select
                  value={newGroupVisibility}
                  onChange={(e) => setNewGroupVisibility(e.target.value as 'all' | 'volunteers')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All signed-in users</option>
                  <option value="volunteers">Volunteers, NGOs, and Admins</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupChatPanel;
