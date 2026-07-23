import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Image as ImageIcon, Loader2, Lock, MessageCircle, Plus, Send, Settings, Users, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import {
  canAccessDiscussion,
  getDiscussionRoomName,
  sendDiscussionMessage
} from '../lib/discussions';
import type { DiscussionMessage, DiscussionRoom } from '../lib/discussions';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';
import {
  backfillGroupInviteMappings,
  createCustomGroupChat,
  sendGroupMessage,
  type GroupChat,
  type GroupMessage,
} from '../lib/groupChat';
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
  const [showMobileDiscussionChat, setShowMobileDiscussionChat] = useState(false);
  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();
  const discussionMessagesRef = useRef<HTMLDivElement>(null);
  const groupMessagesRef = useRef<HTMLDivElement>(null);

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
  const hasActiveMobileSelection = activeTab === 'groups'
    ? !!selectedGroupId
    : showMobileDiscussionChat && !!selectedRoomId;

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
        showToast(
          error?.code === 'permission-denied'
            ? 'Permission denied loading groups.'
            : 'Failed to load groups.',
          'error'
        );
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

      // Load the created doc so the chat panel can open before the list snapshot updates.
      try {
        const groupSnap = await getDoc(doc(db, 'groups', groupId));
        if (groupSnap.exists()) {
          const createdGroup = { id: groupSnap.id, ...groupSnap.data() } as GroupChat;
          setGroups((prev) => {
            if (prev.some((group) => group.id === createdGroup.id)) return prev;
            return [createdGroup, ...prev];
          });
        }
      } catch (loadError) {
        console.error('Load created group error:', loadError);
      }

      setNewGroupName('');
      setNewGroupVisibility('all');
      setShowCreateGroupModal(false);
      setActiveTab('groups');
      setSelectedGroupId(groupId);
      showToast('Group created.', 'success');
    } catch (error: any) {
      console.error('Create group error:', error);
      showToast(
        error?.code === 'permission-denied'
          ? 'Permission denied creating group. Check that you are signed in.'
          : error?.message || 'Failed to create group.',
        'error'
      );
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
      showToast(
        error?.code === 'permission-denied'
          ? 'Permission denied loading discussions.'
          : 'Failed to load discussion rooms.',
        'error'
      );
    });

    return () => unsubscribe();
  }, [isOpen, profile, profileLoading]);

  // When opened with a room id (e.g. after joining from the feed), load that room
  // if the participants list has not delivered it yet.
  useEffect(() => {
    if (!isOpen || !selectedRoomId || !profile || profileLoading) return;
    if (rooms.some((room) => room.id === selectedRoomId)) return;

    let cancelled = false;

    const loadRoomById = async () => {
      try {
        const roomSnap = await getDoc(doc(db, 'discussions', selectedRoomId));
        if (cancelled || !roomSnap.exists()) return;

        const room = { id: roomSnap.id, ...roomSnap.data() } as DiscussionRoom;
        if (!canAccessDiscussion(profile, room.audience)) return;

        setRooms((prev) => {
          if (prev.some((item) => item.id === room.id)) return prev;
          return [room, ...prev];
        });
      } catch (error) {
        console.error('Load discussion by id error:', error);
      }
    };

    void loadRoomById();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedRoomId, profile, profileLoading, rooms]);

  // Opening a discussion from the feed should land on the chat panel on mobile too.
  useEffect(() => {
    if (isOpen && selectedRoomId) {
      setShowMobileDiscussionChat(true);
      setActiveTab('discussions');
    }
  }, [isOpen, selectedRoomId]);

  const selectedRoom = useMemo(() => {
    if (!rooms.length) return null;
    if (selectedRoomId) {
      return rooms.find((room) => room.id === selectedRoomId) || null;
    }
    return null;
  }, [rooms, selectedRoomId]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

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
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    const scrollContainer = discussionMessagesRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [messages]);

  useLayoutEffect(() => {
    const scrollContainer = groupMessagesRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [groupMessages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextMessageText = messageText.trim();
    if (!profile || !selectedRoom || !nextMessageText || isSending) return;

    setMessageText('');
    setIsSending(true);
    try {
      await sendDiscussionMessage(selectedRoom.id, profile, nextMessageText);
    } catch (error) {
      console.error('Send discussion message error:', error);
      setMessageText(nextMessageText);
      showToast('Failed to send message.', 'error');
    } finally {
      setIsSending(false);
    }
  };



  // Selected room memo and effect are defined above.

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-x-0 bottom-0 top-16 z-50 w-full overflow-hidden bg-white shadow-2xl transition-transform duration-300 md:left-auto md:max-w-[820px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ height: 'calc(100dvh - 4rem)', maxHeight: 'calc(100dvh - 4rem)' }}
      >
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[300px_minmax(0,1fr)]">
          <div className={`${hasActiveMobileSelection ? 'hidden md:flex' : 'flex'} h-full min-h-0 flex-col overflow-hidden border-r border-gray-200`}>
            {/* Header with Tabs */}
            <div className="shrink-0 border-b border-gray-200">
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
                      className="rounded-full p-2 text-emerald-600 hover:bg-emerald-50"
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
                    setShowMobileDiscussionChat(false);
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
                    setShowMobileDiscussionChat(false);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'groups'
                      ? 'border-b-2 border-emerald-600 text-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Groups
                </button>
              </div>
            </div>

            {/* Content based on tab */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                      const isActive = selectedRoom?.id === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            onSelectRoom(room.id);
                            setShowMobileDiscussionChat(true);
                          }}
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
                              <p className="truncate text-sm font-bold text-gray-950">
                                {getDiscussionRoomName(room)}
                              </p>
                              {room.audience === 'restricted' && <Lock size={12} className="shrink-0 text-gray-400" />}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {room.lastMessage || room.description || `Post by ${room.postOwnerName || 'Community'}`}
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
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        <Plus size={16} />
                        Create Group
                      </button>
                    </div>
                  ) : (
                    <>
                      {groups.map((group) => {
                        const isActive = selectedGroup?.id === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => setSelectedGroupId(group.id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                              {group.groupPic ? (
                                <img src={group.groupPic} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
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
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
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

          <div className={`${hasActiveMobileSelection ? 'flex' : 'hidden md:flex'} h-full min-h-0 flex-col overflow-hidden`}>
            {activeTab === 'discussions' ? (
              // DISCUSSION VIEW
              <>
                {!selectedRoom ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle size={42} className="mb-3 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-900">Select a room</h3>
                    <p className="mt-1 text-sm text-gray-500">Your discussion will open here.</p>
                  </div>
                ) : (
                  <>
                    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4">
                      <button
                        type="button"
                        onClick={() => setShowMobileDiscussionChat(false)}
                        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                        aria-label="Back to discussions"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                        {selectedRoom.postImageUrl ? (
                          <img
                            src={selectedRoom.postImageUrl}
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
                          {getDiscussionRoomName(selectedRoom)}
                        </h3>
                        <p className="text-xs font-medium text-gray-500">
                          {selectedRoom.audience === 'restricted'
                            ? 'Volunteers & NGOs only'
                            : 'Open discussion'}
                        </p>
                      </div>
                    </header>

                    <div ref={discussionMessagesRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5">
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
                              <div key={message.id} className={`flex min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[78%] min-w-0 flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                  {!isMe && (
                                    <span className="mb-1 px-1 text-[11px] font-bold text-gray-500">
                                      {message.senderName}
                                    </span>
                                  )}
                                  <div
                                    className={`max-w-full min-w-0 overflow-hidden rounded-3xl px-4 py-2 text-sm leading-6 ${
                                      isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                  >
                                    <p className="max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
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
            ) : (
              // GROUP CHAT VIEW
              <>
                {!selectedGroup ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Users size={42} className="mb-3 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-900">Select a group</h3>
                    <p className="mt-1 text-sm text-gray-500">Your group chat will open here.</p>
                  </div>
                ) : (
                  <>
                    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedGroupId(null)}
                          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                          aria-label="Back to groups"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100 shrink-0">
                          {selectedGroup.groupPic ? (
                            <img
                              src={selectedGroup.groupPic}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                              <Users size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-gray-950">
                            {selectedGroup.groupName}
                          </h3>
                          <p className="text-xs font-medium text-gray-500">
                            {selectedGroup.members.length} member
                            {selectedGroup.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedGroupData(selectedGroup);
                          setShowGroupInfo(true);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full"
                        title="Group Info"
                      >
                        <Settings size={18} />
                      </button>
                    </header>

                    <div ref={groupMessagesRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5">
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
                                      isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                  >
                                    <p className="max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
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
          </div>
        </div>

        {/* Group Info Modal */}
        {selectedGroupData && (
          <GroupInfoModal
            isOpen={showGroupInfo}
            group={selectedGroupData}
            members={selectedGroupData.members.map((uid) => ({
              uid,
              displayName: uid === currentUserUid
                ? (profile?.displayName || profile?.name || 'You')
                : `Member ${uid.slice(0, 6)}`,
              avatar: uid === currentUserUid ? profile?.photoURL : undefined,
              role: uid === currentUserUid ? profile?.role || 'member' : 'member',
              isAdmin: selectedGroupData.admins.includes(uid)
            }))}
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isCreatingGroup ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>,
    document.body
  );
};

export default DiscussionDrawer;
