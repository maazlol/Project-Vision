import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Copy,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Settings,
  Users
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import {
  buildDiscussionInviteLink,
  canAccessDiscussion,
  createCustomDiscussion,
  getDiscussionRoomName,
  joinDiscussionRoomById,
  sendDiscussionMessage,
  updateCustomDiscussionDetails,
  type DiscussionAudience,
  type DiscussionMessage,
  type DiscussionRoom
} from '../lib/discussions';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';

const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  } catch {
    return '';
  }
};

const MessagesPage: React.FC = () => {
  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAudience, setGroupAudience] = useState<DiscussionAudience>('all');
  const [inviteRoom, setInviteRoom] = useState<DiscussionRoom | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageUrl, setSettingsImageUrl] = useState('');
  const [savingRoomInfo, setSavingRoomInfo] = useState(false);

  const { discussionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserRole();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledInviteRef = useRef<string | null>(null);

  const joinId = useMemo(() => new URLSearchParams(location.search).get('join'), [location.search]);

  const selectedRoom = useMemo(() => {
    if (!discussionId) return null;
    return rooms.find((room) => room.id === discussionId) || null;
  }, [rooms, discussionId]);

  const clearJoinQuery = () => {
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
  };

  const openRoom = (roomId: string) => {
    navigate(`/discussions/${roomId}`);
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || creatingGroup) return;
    if (!groupName.trim()) {
      showToast('Group name is required.', 'error');
      return;
    }

    setCreatingGroup(true);
    try {
      const roomId = await createCustomDiscussion(profile, {
        groupName,
        description: groupDescription,
        audience: groupAudience
      });

      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
      setGroupAudience('all');
      showToast('Custom group created.', 'success');
      navigate(`/discussions/${roomId}`, { replace: true });
    } catch (error) {
      console.error('Create group error:', error);
      showToast('Failed to create group.', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!selectedRoom || selectedRoom.type !== 'custom') return;

    try {
      await navigator.clipboard.writeText(buildDiscussionInviteLink(selectedRoom.id));
      showToast('Link Copied!', 'success');
    } catch (error) {
      console.error('Invite copy error:', error);
      showToast('Could not copy invite link.', 'error');
    }
  };

  const handleShareInvite = async () => {
    if (!selectedRoom || selectedRoom.type !== 'custom') return;

    const inviteLink = buildDiscussionInviteLink(selectedRoom.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${getDiscussionRoomName(selectedRoom)}`,
          text: `Join my discussion room: ${getDiscussionRoomName(selectedRoom)}`,
          url: inviteLink,
        });
        return;
      }

      await navigator.clipboard.writeText(inviteLink);
      showToast('Invite link copied.', 'success');
    } catch (error) {
      console.error('Invite share error:', error);
      showToast('Could not share invite link.', 'error');
    }
  };

  const canEditSelectedRoom = !!(
    selectedRoom &&
    profile &&
    (selectedRoom.creatorId === profile.uid || selectedRoom.postOwnerId === profile.uid || profile.role === 'admin')
  );

  const handleSaveRoomInfo = async () => {
    if (!selectedRoom || !profile || savingRoomInfo) return;

    setSavingRoomInfo(true);
    try {
      await updateCustomDiscussionDetails(selectedRoom, profile, {
        groupName: settingsName,
        description: settingsDescription,
        imageUrl: settingsImageUrl
      });
      showToast('Group settings updated.', 'success');
    } catch (error: any) {
      console.error('Room settings update error:', error);
      showToast(error.message || 'Failed to update group settings.', 'error');
    } finally {
      setSavingRoomInfo(false);
    }
  };

  const handleInviteJoin = async () => {
    if (!inviteRoom || !profile) return;

    try {
      await joinDiscussionRoomById(inviteRoom.id, profile);
      setShowInviteModal(false);
      setInviteRoom(null);
      clearJoinQuery();
      navigate(`/discussions/${inviteRoom.id}`, { replace: true });
      showToast(`Joined ${getDiscussionRoomName(inviteRoom)}.`, 'success');
    } catch (error) {
      console.error('Invite join error:', error);
      showToast('Failed to join this group.', 'error');
    }
  };

  useEffect(() => {
    if (profileLoading) return;

    if (!joinId) {
      handledInviteRef.current = null;
      setInviteRoom(null);
      setShowInviteModal(false);
      setInviteLoading(false);
      return;
    }

    if (handledInviteRef.current === joinId) return;
    handledInviteRef.current = joinId;

    if (!profile) {
      sessionStorage.setItem('pendingDiscussionJoin', joinId);
      navigate('/login', { replace: true });
      return;
    }

    const loadInvite = async () => {
      setInviteLoading(true);
      try {
        const roomSnap = await getDoc(doc(db, 'discussions', joinId));
        if (!roomSnap.exists()) {
          showToast('Invitation link is invalid.', 'error');
          clearJoinQuery();
          return;
        }

        const room = { id: roomSnap.id, ...roomSnap.data() } as DiscussionRoom;

        if (!canAccessDiscussion(profile, room.audience)) {
          showToast('This group is restricted to Volunteers and NGOs.', 'error');
          clearJoinQuery();
          return;
        }

        if ((room.participants || []).includes(profile.uid)) {
          setInviteRoom(null);
          setShowInviteModal(false);
          openRoom(room.id);
          clearJoinQuery();
          return;
        }

        setInviteRoom(room);
        setShowInviteModal(true);
      } catch (error) {
        console.error('Invite load error:', error);
        showToast('Could not open invite link.', 'error');
      } finally {
        setInviteLoading(false);
      }
    };

    void loadInvite();
  }, [joinId, navigate, profile, profileLoading]);

  useEffect(() => {
    if (profileLoading) return;

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
  }, [profile, profileLoading]);

  useEffect(() => {
    if (!selectedRoom || !profile || !canAccessDiscussion(profile, selectedRoom.audience)) {
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
  }, [profile, selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showRoomInfo || !selectedRoom) return;
    setSettingsName(getDiscussionRoomName(selectedRoom));
    setSettingsDescription(selectedRoom.description || '');
    setSettingsImageUrl(selectedRoom.postImageUrl || '');
  }, [showRoomInfo, selectedRoom]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !selectedRoom || !messageText.trim() || isSending) return;

    if (!canAccessDiscussion(profile, selectedRoom.audience)) {
      showToast('You do not have access to this room.', 'error');
      return;
    }

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

  const currentUserId = auth.currentUser?.uid;

  return (
    <div className="pt-16 min-h-screen bg-white">
      <div className="mx-auto h-[calc(100dvh-4rem)] max-w-7xl border-x border-gray-200 bg-white md:my-6 md:h-[calc(100dvh-7rem)] md:rounded-lg md:border">
        <div className="grid h-full grid-cols-1 md:grid-cols-[320px_1fr]">
          <aside className={`${selectedRoom ? 'hidden md:flex' : 'flex'} h-full flex-col border-r border-gray-200 bg-white`}>
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
              <div>
                <h1 className="text-lg font-black text-gray-950">Discussions</h1>
                <p className="text-xs font-medium text-gray-500">Joined rooms and custom groups</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100"
                aria-label="New Group"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {roomsLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
                  Loading rooms...
                </div>
              ) : !profile ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Lock size={28} className="mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-900">Sign in required</h3>
                  <p className="mt-1 text-sm text-gray-500">Create or join a group after logging in.</p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Users size={28} className="mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-900">No rooms yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Create a custom group or join one from an invite link.</p>
                </div>
              ) : (
                rooms.map((room) => {
                  const isActive = selectedRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => openRoom(room.id)}
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
                          {room.type === 'custom' && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                              Custom
                            </span>
                          )}
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
            </div>
          </aside>

          <section className={`${selectedRoom ? 'flex' : 'hidden md:flex'} h-full flex-col bg-white`}>
            {!selectedRoom ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageCircle size={42} className="mb-3 text-gray-300" />
                <h2 className="text-xl font-black text-gray-900">Select a room</h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  Pick an existing discussion, create a custom group, or open an invite link.
                </p>
              </div>
            ) : !profile || !canAccessDiscussion(profile, selectedRoom.audience) ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Lock size={42} className="mb-4 text-red-300" />
                <h2 className="text-xl font-black text-gray-900">Access restricted</h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500">This room is only available to eligible participants.</p>
              </div>
            ) : (
              <>
                <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/discussions')}
                      className="rounded-full p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                    >
                      <ArrowLeft size={20} />
                    </button>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                      {selectedRoom.postImageUrl ? (
                        <img src={selectedRoom.postImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-gray-950">
                        {getDiscussionRoomName(selectedRoom)}
                      </h2>
                      <p className="truncate text-xs font-medium text-gray-500">
                        {selectedRoom.type === 'custom'
                          ? selectedRoom.description || 'Custom group'
                          : selectedRoom.audience === 'restricted'
                            ? 'Volunteers & NGOs only'
                            : 'Open discussion'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {selectedRoom.type === 'custom' && (
                      <button
                        type="button"
                        onClick={handleShareInvite}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 sm:px-4"
                      >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Invite</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowRoomInfo(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100 sm:px-4"
                    >
                      <Settings size={16} />
                      <span className="hidden sm:inline">Settings</span>
                    </button>
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
                      <p className="mt-1 text-sm text-gray-500">Start the conversation here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isMe = message.senderId === currentUserId;
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
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-white/70 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-gray-900">Create Custom Group</h3>
                <p className="text-xs text-gray-500">Make a separate room for a focused topic.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Lock size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  placeholder="Example: Ramadan Support Team"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Group Description
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  placeholder="Optional note about what this group is for"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Privacy
                </label>
                <select
                  value={groupAudience}
                  onChange={(e) => setGroupAudience(e.target.value as DiscussionAudience)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="all">All</option>
                  <option value="restricted">Restricted to Volunteers & NGOs</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupName.trim()}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingGroup ? <Loader2 size={16} className="animate-spin" /> : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && inviteRoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/70 overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                You have been invited
              </p>
              <h3 className="mt-1 text-lg font-black text-gray-950">{getDiscussionRoomName(inviteRoom)}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {inviteRoom.description || 'A custom discussion group is waiting for you.'}
              </p>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm font-semibold text-gray-800">
                Do you want to join this group?
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                This will add the room to your sidebar and open it in the main chat panel.
              </p>
            </div>

            <div className="flex gap-2 bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteRoom(null);
                  clearJoinQuery();
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInviteJoin}
                disabled={inviteLoading}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoomInfo && selectedRoom && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-gray-950">
                  {selectedRoom.type === 'custom' ? 'Group Settings' : 'Discussion Settings'}
                </h3>
                <p className="text-xs text-gray-500">Profile, invite, and room info.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoomInfo(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <MessageCircle size={18} />
              </button>
            </div>

            <div className="max-h-[calc(90dvh-4.5rem)] space-y-4 overflow-y-auto px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                  {settingsImageUrl ? (
                    <img src={settingsImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <ImageIcon size={26} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Picture URL</label>
                  <input
                    type="url"
                    value={settingsImageUrl}
                    onChange={(event) => setSettingsImageUrl(event.target.value)}
                    disabled={!canEditSelectedRoom || savingRoomInfo}
                    placeholder="https://example.com/group.jpg"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Group Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(event) => setSettingsName(event.target.value)}
                  disabled={!canEditSelectedRoom || savingRoomInfo}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-950 outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                <textarea
                  value={settingsDescription}
                  onChange={(event) => setSettingsDescription(event.target.value)}
                  disabled={!canEditSelectedRoom || savingRoomInfo}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {!canEditSelectedRoom && (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Only the creator or an admin can edit chat details.
                  </p>
                )}
              </div>
              {selectedRoom.type === 'custom' && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Invite Link</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={buildDiscussionInviteLink(selectedRoom.id)}
                      readOnly
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      aria-label="Copy invite link"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Participants</p>
                  <p className="mt-1 text-sm font-semibold text-gray-950">{selectedRoom.participants.length}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Privacy</p>
                  <p className="mt-1 text-sm font-semibold text-gray-950">
                    {selectedRoom.audience === 'restricted' ? 'Volunteers only' : 'Everyone'}
                  </p>
                </div>
              </div>
              {selectedRoom.type === 'custom' && (
                <button
                  type="button"
                  onClick={handleShareInvite}
                  className="w-full rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Share Invite
                </button>
              )}
              {canEditSelectedRoom && (
                <button
                  type="button"
                  onClick={handleSaveRoomInfo}
                  disabled={savingRoomInfo || !settingsName.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingRoomInfo ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
