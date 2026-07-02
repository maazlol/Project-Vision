import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, Loader2, Lock, MessageCircle, Plus, Send, Settings, Users, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { canAccessDiscussion, sendDiscussionMessage } from '../lib/discussions';
import type { DiscussionMessage, DiscussionRoom } from '../lib/discussions';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';
import { createCustomGroupChat, sendGroupMessage, type GroupChat, type GroupMessage } from '../lib/groupChat';
import GroupInfoModal from './GroupInfoModal';

interface DiscussionDrawerProps {
  isOpen: boolean;
  selectedRoomId?: string | null;
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
}

const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  } catch {
    return '';
  }
};

const DiscussionDrawer: React.FC<DiscussionDrawerProps> = ({
  isOpen,
  selectedRoomId,
  onClose,
  onSelectRoom
}) => {
  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group Chat State variables
  const [activeTab, setActiveTab] = useState<'discussions' | 'groups'>('discussions');
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupMessagesLoading, setGroupMessagesLoading] = useState(false);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [isGroupSending, setIsGroupSending] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedGroupData, setSelectedGroupData] = useState<GroupChat | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupVisibility, setNewGroupVisibility] = useState<'all' | 'volunteers'>('all');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
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

  const handleGroupSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !selectedGroupId || !groupMessageText.trim() || isGroupSending) return;

    setIsGroupSending(true);
    try {
      await sendGroupMessage(selectedGroupId, profile, groupMessageText);
      setGroupMessageText('');
    } catch (error) {
      console.error('Send group message error:', error);
      showToast('Failed to send message.', 'error');
    } finally {
      setIsGroupSending(false);
    }
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || isCreatingGroup) return;
    if (!newGroupName.trim()) {
      showToast('Group name is required.', 'error');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const groupId = await createCustomGroupChat(profile, {
        groupName: newGroupName,
        visibilityScope: newGroupVisibility
      });
      setNewGroupName('');
      setNewGroupVisibility('all');
      setShowCreateGroupModal(false);
      setActiveTab('groups');
      setSelectedGroupId(groupId);
      showToast('Group created.', 'success');
    } catch (error: any) {
      console.error('Create group error:', error);
      showToast(error.message || 'Failed to create group.', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };
  useEffect(() => {
    if (!isOpen || profileLoading) return;

    if (!profile) {
      setRooms([]);
      setRoomsLoading(false);
      return;
    }

    setRoomsLoading(true);
    const roomsQuery = query(
      collection(db, 'discussions'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const nextRooms = snapshot.docs
        .map((roomDoc) => ({ id: roomDoc.id, ...roomDoc.data() }) as DiscussionRoom)
        .filter((room) => canAccessDiscussion(profile, room.audience))
        .sort((a, b) => {
          const aTime = a.lastMessageAt?.toDate?.() || a.updatedAt?.toDate?.() || new Date(0);
          const bTime = b.lastMessageAt?.toDate?.() || b.updatedAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

      setRooms(nextRooms);
      setRoomsLoading(false);
    }, (error) => {
      console.error('Discussion rooms error:', error);
      setRoomsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, profile, profileLoading]);

  const selectedRoom = useMemo(() => {
    if (!rooms.length) return null;
    return rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!isOpen || !selectedRoom || selectedRoom.id === selectedRoomId) return;
    onSelectRoom(selectedRoom.id);
  }, [isOpen, selectedRoom, selectedRoomId, onSelectRoom]);

  useEffect(() => {
    if (!isOpen || !selectedRoom || !profile || !canAccessDiscussion(profile, selectedRoom.audience)) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const messagesQuery = query(
      collection(db, 'discussions', selectedRoom.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data()
      })) as DiscussionMessage[]);
      setMessagesLoading(false);
    }, (error) => {
      console.error('Discussion messages error:', error);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, selectedRoom, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !selectedRoom || !messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendDiscussionMessage(selectedRoom.id, profile, messageText);
      setMessageText('');
    } catch (error) {
      console.error('Send discussion message error:', error);
      showToast('Failed to send message.', 'error');
    } finally {
      setIsSending(false);
    }
  };



  // Selected room memo and effect are defined above.

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[820px] bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
          <div className="flex h-full flex-col border-r border-gray-200">
            {/* Header with Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex h-16 items-center justify-between px-5">
                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    {activeTab === 'discussions' ? 'Discussions' : 'Group Chats'}
                  </h2>
                  <p className="text-xs font-medium text-gray-500">
                    {activeTab === 'discussions' ? 'Feed rooms you joined' : 'Your group chats'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {activeTab === 'groups' && profile && (
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(true)}
                      className="rounded-full p-2 text-blue-600 hover:bg-blue-50"
                      title="Create group"
                      aria-label="Create group"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex border-t border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab('discussions');
                    setSelectedGroupId(null);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'discussions'
                      ? 'border-b-2 border-emerald-600 text-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Discussions
                </button>
                <button
                  onClick={() => {
                    setActiveTab('groups');
                    setSelectedGroupId(null);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'groups'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Groups
                </button>
              </div>
            </div>

            {/* Content based on tab */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'discussions' ? (
                // DISCUSSIONS TAB CONTENT
                <>
                  {roomsLoading ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                      Loading rooms...
                    </div>
                  ) : !profile ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Lock size={28} className="mb-3 text-gray-300" />
                      <h3 className="font-bold text-gray-900">Sign in required</h3>
                      <p className="mt-1 text-sm text-gray-500">Join discussions after logging in.</p>
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Users size={28} className="mb-3 text-gray-300" />
                      <h3 className="font-bold text-gray-900">No rooms yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Click Discuss on an enabled feed post.</p>
                    </div>
                  ) : (
                    rooms.map((room) => {
                      const isActive = rooms.find(r => r.id === selectedRoomId)?.id === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => onSelectRoom(room.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                            {room.postImageUrl ? (
                              <img src={room.postImageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-bold text-gray-950">{room.postTitle}</p>
                              {room.audience === 'restricted' && <Lock size={12} className="shrink-0 text-gray-400" />}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {room.lastMessage || `Post by ${room.postOwnerName}`}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </>
              ) : (
                // GROUPS TAB CONTENT
                <>
                  {groupsLoading ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                      Loading groups...
                    </div>
                  ) : !profile ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Lock size={28} className="mb-3 text-gray-300" />
                      <h3 className="font-bold text-gray-900">Sign in required</h3>
                      <p className="mt-1 text-sm text-gray-500">Join groups after logging in.</p>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <MessageCircle size={28} className="mb-3 text-gray-300" />
                      <h3 className="font-bold text-gray-900">No groups yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Create a group or join one from an invite link.</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateGroupModal(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
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
                            type="button"
                            onClick={() => setSelectedGroupId(group.id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                              {group.groupPic ? (
                                <img src={group.groupPic} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  <Users size={20} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-950">{group.groupName}</p>
                              <p className="truncate text-xs text-gray-500">
                                {group.lastMessage || `${group.members.length} member${group.members.length !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      <div className="p-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateGroupModal(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Plus size={16} />
                          Create Group
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="hidden h-full flex-col md:flex">
            {activeTab === 'discussions' ? (
              // DISCUSSION VIEW
              <>
                {!selectedRoomId || !rooms.find(r => r.id === selectedRoomId) ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle size={42} className="mb-3 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-900">Select a room</h3>
                    <p className="mt-1 text-sm text-gray-500">Your discussion will open here.</p>
                  </div>
                ) : (
                  <>
                    {rooms.find(r => r.id === selectedRoomId) && (
                      <>
                        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4">
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                            {rooms.find(r => r.id === selectedRoomId)?.postImageUrl ? (
                              <img
                                src={rooms.find(r => r.id === selectedRoomId)?.postImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-gray-950">
                              {rooms.find(r => r.id === selectedRoomId)?.postTitle}
                            </h3>
                            <p className="text-xs font-medium text-gray-500">
                              {rooms.find(r => r.id === selectedRoomId)?.audience === 'restricted'
                                ? 'Volunteers & NGOs only'
                                : 'Open discussion'}
                            </p>
                          </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 py-5">
                          {messagesLoading ? (
                            <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                              Loading messages...
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                              <MessageCircle size={34} className="mb-3 text-gray-300" />
                              <h3 className="font-black text-gray-900">No messages yet</h3>
                              <p className="mt-1 text-sm text-gray-500">Start the discussion for this post.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {messages.map((message) => {
                                const isMe = message.senderId === currentUserUid;
                                return (
                                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[78%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                      {!isMe && (
                                        <span className="mb-1 px-1 text-[11px] font-bold text-gray-500">
                                          {message.senderName}
                                        </span>
                                      )}
                                      <div
                                        className={`rounded-3xl px-4 py-2 text-sm leading-6 ${
                                          isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                      >
                                        <p className="break-words whitespace-pre-wrap">{message.text}</p>
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

                        <form onSubmit={handleSend} className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 focus-within:border-gray-400">
                            <input
                              type="text"
                              value={messageText}
                              onChange={(event) => setMessageText(event.target.value)}
                              placeholder="Message..."
                              disabled={isSending}
                              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                            />
                            <button
                              type="submit"
                              disabled={!messageText.trim() || isSending}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              // GROUP CHAT VIEW
              <>
                {!selectedGroupId || !groups.find(g => g.id === selectedGroupId) ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Users size={42} className="mb-3 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-900">Select a group</h3>
                    <p className="mt-1 text-sm text-gray-500">Your group chat will open here.</p>
                  </div>
                ) : (
                  <>
                    {groups.find(g => g.id === selectedGroupId) && (
                      <>
                        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100 shrink-0">
                              {groups.find(g => g.id === selectedGroupId)?.groupPic ? (
                                <img
                                  src={groups.find(g => g.id === selectedGroupId)?.groupPic}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  <Users size={18} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-gray-950">
                                {groups.find(g => g.id === selectedGroupId)?.groupName}
                              </h3>
                              <p className="text-xs font-medium text-gray-500">
                                {groups.find(g => g.id === selectedGroupId)?.members.length} member
                                {groups.find(g => g.id === selectedGroupId)?.members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedGroupData(groups.find(g => g.id === selectedGroupId) || null);
                              setShowGroupInfo(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full"
                            title="Group Info"
                          >
                            <Settings size={18} />
                          </button>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 py-5">
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
                                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[78%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                      {!isMe && (
                                        <span className="mb-1 px-1 text-[11px] font-bold text-gray-500">
                                          {message.senderName}
                                        </span>
                                      )}
                                      <div
                                        className={`rounded-3xl px-4 py-2 text-sm leading-6 ${
                                          isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                      >
                                        <p className="break-words whitespace-pre-wrap">{message.text}</p>
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

                        <form onSubmit={handleGroupSend} className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 focus-within:border-gray-400">
                            <input
                              type="text"
                              value={groupMessageText}
                              onChange={(event) => setGroupMessageText(event.target.value)}
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
                  </>
                )}
              </>
            )}
          </div>
        </div>

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
              // Refresh group list
              setSelectedGroupId(null);
              setSelectedGroupId(selectedGroupId);
            }}
          />
        )}
      </aside>

      {showCreateGroupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-gray-900">Create Group</h3>
                <p className="text-xs text-gray-500">Start your own group chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Example: Volunteer Team"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Privacy
                </label>
                <select
                  value={newGroupVisibility}
                  onChange={(event) => setNewGroupVisibility(event.target.value as 'all' | 'volunteers')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="all">All signed-in users</option>
                  <option value="volunteers">Volunteers, NGOs, and Admins</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingGroup ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

y    </>
  );
};

export default DiscussionDrawer;
