import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './useUserRole';

export type DiscussionAudience = 'all' | 'restricted';
export type DiscussionType = 'post' | 'custom';

export interface DiscussionRoom {
  id: string;
  type: DiscussionType;
  postId: string;
  postOwnerId: string;
  postOwnerName: string;
  postTitle: string;
  postText: string;
  postImageUrl: string;
  groupName?: string;
  description?: string;
  audience: DiscussionAudience;
  creatorId?: string;
  creatorName?: string;
  participants: string[];
  participantRoles?: Record<string, string>;
  createdAt?: any;
  updatedAt?: any;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
}

export interface DiscussionMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: any;
}

export const canAccessDiscussion = (
  profile: UserProfile | null,
  audience: DiscussionAudience = 'all'
) => {
  if (!profile) return false;
  if (audience === 'all') return true;
  return profile.role === 'volunteer' || profile.role === 'ngo' || profile.role === 'admin';
};

export const getDiscussionTitle = (post: any) => {
  const text = (post.text || '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 80) : `Discussion by ${post.userName || 'Community'}`;
};

export const getDiscussionRoomName = (room: Partial<DiscussionRoom> | null | undefined) => {
  if (!room) return 'Discussion';
  return room.groupName || room.postTitle || `Discussion by ${room.creatorName || room.postOwnerName || 'Community'}`;
};

export const buildDiscussionInviteLink = (roomId: string) => {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL;
  return `${origin}${base}#/discussions?join=${encodeURIComponent(roomId)}`;
};

export const joinDiscussionRoom = async (post: any, profile: UserProfile) => {
  const audience = (post.discussionAudience || 'all') as DiscussionAudience;

  if (!canAccessDiscussion(profile, audience)) {
    throw new Error('You do not have access to this discussion room.');
  }

  const roomRef = doc(db, 'discussions', post.id);
  const participantRolePath = `participantRoles.${profile.uid}`;
  const roomPayload = {
    type: 'post' as DiscussionType,
    postId: post.id,
    postOwnerId: post.userId || '',
    postOwnerName: post.userName || 'Community',
    postTitle: getDiscussionTitle(post),
    postText: post.text || '',
    postImageUrl: post.imageUrl || '',
    groupName: '',
    description: '',
    audience,
    creatorId: post.userId || '',
    creatorName: post.userName || 'Community',
    participants: [profile.uid],
    participantRoles: {
      [profile.uid]: profile.role
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: '',
    lastMessageAt: null,
    lastMessageSenderId: '',
    lastMessageSenderName: ''
  };

  try {
    await updateDoc(roomRef, {
      participants: arrayUnion(profile.uid),
      [participantRolePath]: profile.role,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    if (error?.code !== 'not-found') throw error;
    await setDoc(roomRef, roomPayload);
  }
};

export const createCustomDiscussion = async (
  profile: UserProfile,
  data: {
    groupName: string;
    description?: string;
    audience: DiscussionAudience;
  }
) => {
  const roomRef = doc(collection(db, 'discussions'));

  await setDoc(roomRef, {
    type: 'custom' as DiscussionType,
    postId: '',
    postOwnerId: '',
    postOwnerName: '',
    postTitle: '',
    postText: '',
    postImageUrl: '',
    groupName: data.groupName.trim(),
    description: data.description?.trim() || '',
    audience: data.audience,
    creatorId: profile.uid,
    creatorName: profile.displayName || profile.name || 'User',
    participants: [profile.uid],
    participantRoles: {
      [profile.uid]: profile.role
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: '',
    lastMessageAt: null,
    lastMessageSenderId: '',
    lastMessageSenderName: ''
  });

  return roomRef.id;
};

export const updateCustomDiscussionDetails = async (
  room: DiscussionRoom,
  profile: UserProfile,
  data: {
    groupName: string;
    description?: string;
    imageUrl?: string;
  }
) => {
  const canEdit =
    room.creatorId === profile.uid ||
    room.postOwnerId === profile.uid ||
    profile.role === 'admin';

  if (!canEdit) {
    throw new Error('Only the creator or an admin can edit this chat.');
  }

  const cleanName = data.groupName.trim();
  if (!cleanName) {
    throw new Error('Group name is required.');
  }

  await updateDoc(doc(db, 'discussions', room.id), {
    groupName: cleanName,
    postTitle: room.type === 'post' ? cleanName : room.postTitle,
    description: data.description?.trim() || '',
    postImageUrl: data.imageUrl?.trim() || '',
    updatedAt: serverTimestamp()
  });
};

export const joinDiscussionRoomById = async (roomId: string, profile: UserProfile) => {
  const roomRef = doc(db, 'discussions', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Discussion room not found.');
  }

  const room = { id: roomSnap.id, ...roomSnap.data() } as DiscussionRoom;
  if (!canAccessDiscussion(profile, room.audience)) {
    throw new Error('You do not have access to this discussion room.');
  }

  await updateDoc(roomRef, {
    participants: arrayUnion(profile.uid),
    [`participantRoles.${profile.uid}`]: profile.role,
    updatedAt: serverTimestamp()
  });

  return room;
};

export const sendDiscussionMessage = async (
  roomId: string,
  profile: UserProfile,
  text: string
) => {
  const cleanText = text.trim();
  if (!cleanText) return;

  await addDoc(collection(db, 'discussions', roomId, 'messages'), {
    senderId: profile.uid,
    senderName: profile.displayName || profile.name || 'User',
    senderRole: profile.role,
    text: cleanText,
    timestamp: serverTimestamp()
  });

  await updateDoc(doc(db, 'discussions', roomId), {
    lastMessage: cleanText,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: profile.uid,
    lastMessageSenderName: profile.displayName || profile.name || 'User',
    updatedAt: serverTimestamp()
  });
};
