import {
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './useUserRole';

export interface GroupChat {
  id: string;
  groupId: string;
  groupName: string;
  groupPic: string;
  createdBy: string;
  admins: string[];
  members: string[];
  inviteToken: string;
  visibilityScope: 'all' | 'volunteers';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  avatar?: string;
  role: string;
  isAdmin: boolean;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Timestamp;
  reactions?: Record<string, string[]>;
}

/**
 * Generate a unique invite token for group joining
 */
export const generateInviteToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Create a new group chat when user enables group chat on a post
 */
export const createGroupChat = async (
  postId: string,
  postData: any,
  creatorProfile: UserProfile
): Promise<string> => {
  const groupsRef = collection(db, 'groups');
  
  const groupData: Omit<GroupChat, 'id'> = {
    groupId: postId,
    groupName: `Discussion: ${postData.title || postData.text?.slice(0, 50) || 'New Group'}`,
    groupPic: postData.imageUrl || '',
    createdBy: creatorProfile.uid,
    admins: [creatorProfile.uid],
    members: [creatorProfile.uid],
    inviteToken: generateInviteToken(),
    visibilityScope: (postData.discussionAudience || 'all') as 'all' | 'volunteers',
    createdAt: serverTimestamp() as any,
  };

  try {
    // Check if group already exists for this post
    const existingQuery = query(
      groupsRef,
      where('groupId', '==', postId)
    );
    const existingDocs = await getDocs(existingQuery);
    
    if (!existingDocs.empty) {
      return existingDocs.docs[0].id;
    }

    // Create new group
    const docRef = await addDoc(groupsRef, groupData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group chat:', error);
    throw error;
  }
};

/**
 * Create a standalone group chat from the chat UI.
 */
export const createCustomGroupChat = async (
  creatorProfile: UserProfile,
  data: {
    groupName: string;
    groupPic?: string;
    visibilityScope?: 'all' | 'volunteers';
  }
): Promise<string> => {
  const cleanName = data.groupName.trim();
  if (!cleanName) {
    throw new Error('Group name is required');
  }

  const groupData: Omit<GroupChat, 'id'> = {
    groupId: `custom-${Date.now()}-${creatorProfile.uid}`,
    groupName: cleanName,
    groupPic: data.groupPic?.trim() || '',
    createdBy: creatorProfile.uid,
    admins: [creatorProfile.uid],
    members: [creatorProfile.uid],
    inviteToken: generateInviteToken(),
    visibilityScope: data.visibilityScope || 'all',
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
    lastMessage: '',
    lastMessageSenderId: '',
    lastMessageSenderName: '',
  };

  try {
    const docRef = await addDoc(collection(db, 'groups'), groupData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating custom group chat:', error);
    throw error;
  }
};

/**
 * Get group chat by invite token
 */
export const getGroupByInviteToken = async (inviteToken: string): Promise<GroupChat | null> => {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('inviteToken', '==', inviteToken));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as GroupChat;
  } catch (error) {
    console.error('Error getting group by invite token:', error);
    throw error;
  }
};

/**
 * Join group via invite token - with role-based visibility check
 */
export const joinGroupViaToken = async (
  inviteToken: string,
  userProfile: UserProfile
): Promise<void> => {
  try {
    const group = await getGroupByInviteToken(inviteToken);
    
    if (!group) {
      throw new Error('Invalid invite link');
    }

    // Check visibility scope
    if (group.visibilityScope === 'volunteers') {
      const isVolunteer = userProfile.role === 'volunteer' || 
                         userProfile.role === 'ngo' || 
                         userProfile.role === 'admin';
      if (!isVolunteer) {
        throw new Error('Only volunteers can join this group');
      }
    }

    // Check if already a member
    if (group.members.includes(userProfile.uid)) {
      throw new Error('You are already a member of this group');
    }

    // Add user to members array
    const groupRef = doc(db, 'groups', group.id);
    await updateDoc(groupRef, {
      members: arrayUnion(userProfile.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
};

/**
 * Get full group details with member information
 */
export const getGroupWithMembers = async (
  groupId: string,
  memberProfiles: Record<string, UserProfile>
): Promise<{ group: GroupChat; members: GroupMember[] }> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const group = { id: groupDoc.id, ...groupDoc.data() } as GroupChat;
    
    // Convert member UIDs to GroupMember objects
    const members: GroupMember[] = group.members.map(uid => {
      const profile = memberProfiles[uid];
      return {
        uid,
        displayName: profile?.displayName || profile?.name || 'Unknown User',
        avatar: (profile as any)?.photoURL || (profile as any)?.avatar || (profile as any)?.profilePic || '',
        role: profile?.role || 'user',
        isAdmin: group.admins.includes(uid),
      };
    });

    return { group, members };
  } catch (error) {
    console.error('Error getting group with members:', error);
    throw error;
  }
};

/**
 * Update group name (admin only)
 */
export const updateGroupName = async (
  groupId: string,
  newName: string,
  currentUserUid: string
): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.admins.includes(currentUserUid)) {
      throw new Error('Only admins can change group name');
    }

    await updateDoc(groupRef, {
      groupName: newName.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    throw error;
  }
};

/**
 * Update group picture (admin only)
 */
export const updateGroupPic = async (
  groupId: string,
  newPicUrl: string,
  currentUserUid: string
): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.admins.includes(currentUserUid)) {
      throw new Error('Only admins can change group picture');
    }

    await updateDoc(groupRef, {
      groupPic: newPicUrl.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating group picture:', error);
    throw error;
  }
};

/**
 * Make a member an admin (admin only)
 */
export const makeUserAdmin = async (
  groupId: string,
  userUidToPromote: string,
  currentUserUid: string
): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.admins.includes(currentUserUid)) {
      throw new Error('Only admins can promote members');
    }

    if (group.admins.includes(userUidToPromote)) {
      throw new Error('User is already an admin');
    }

    if (!group.members.includes(userUidToPromote)) {
      throw new Error('User is not a member of this group');
    }

    await updateDoc(groupRef, {
      admins: arrayUnion(userUidToPromote),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    throw error;
  }
};

/**
 * Remove a member from the group (admin only)
 */
export const removeUserFromGroup = async (
  groupId: string,
  userUidToRemove: string,
  currentUserUid: string
): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.admins.includes(currentUserUid)) {
      throw new Error('Only admins can remove members');
    }

    if (userUidToRemove === group.createdBy && group.admins.length === 1) {
      throw new Error('Cannot remove the group creator when they are the only admin');
    }

    await updateDoc(groupRef, {
      members: arrayRemove(userUidToRemove),
      admins: arrayRemove(userUidToRemove),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error removing user from group:', error);
    throw error;
  }
};

/**
 * Leave group - user removes themselves
 */
export const leaveGroup = async (
  groupId: string,
  currentUserUid: string
): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.members.includes(currentUserUid)) {
      throw new Error('You are not a member of this group');
    }

    const updates: any = {
      members: arrayRemove(currentUserUid),
      admins: arrayRemove(currentUserUid),
      updatedAt: serverTimestamp(),
    };

    // If the leaving user was the only admin, assign admin to next available member
    if (group.admins.includes(currentUserUid) && group.admins.length === 1) {
      const nextAdmin = group.members.find(uid => uid !== currentUserUid);
      if (nextAdmin) {
        updates.admins = [nextAdmin];
      }
    }

    await updateDoc(groupRef, updates);
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

/**
 * Send a message to group chat
 */
export const sendGroupMessage = async (
  groupId: string,
  senderProfile: UserProfile,
  messageText: string
): Promise<void> => {
  try {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    
    const messageData = {
      senderId: senderProfile.uid,
      senderName: senderProfile.displayName || senderProfile.name || 'Anonymous',
      senderAvatar: (senderProfile as any)?.photoURL || (senderProfile as any)?.avatar || (senderProfile as any)?.profilePic || '',
      text: messageText.trim(),
      timestamp: serverTimestamp(),
    };

    await addDoc(messagesRef, messageData);

    // Update group's last message info
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      lastMessage: messageText.trim(),
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: senderProfile.uid,
      lastMessageSenderName: senderProfile.displayName || senderProfile.name || 'Anonymous',
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
};

/**
 * Generate invite link for group
 */
export const generateGroupInviteLink = (inviteToken: string): string => {
  const basePath = window.location.origin;
  return `${basePath}/#/chat/join/${encodeURIComponent(inviteToken)}`;
};

/**
 * Regenerate invite token (admin only)
 */
export const regenerateInviteToken = async (
  groupId: string,
  currentUserUid: string
): Promise<string> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as GroupChat;
    
    if (!group.admins.includes(currentUserUid)) {
      throw new Error('Only admins can regenerate invite links');
    }

    const newToken = generateInviteToken();
    await updateDoc(groupRef, {
      inviteToken: newToken,
      updatedAt: serverTimestamp(),
    });

    return newToken;
  } catch (error) {
    console.error('Error regenerating invite token:', error);
    throw error;
  }
};

/**
 * Get user's groups
 */
export const getUserGroups = async (userUid: string): Promise<GroupChat[]> => {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userUid));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupChat[];
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
};
