import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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

const writeGroupInviteMapping = async (
  inviteToken: string,
  groupId: string,
  createdBy: string
) => {
  await setDoc(doc(db, 'groupInvites', inviteToken), {
    groupId,
    createdBy,
    createdAt: serverTimestamp(),
  });
};

/**
 * Ensure legacy groups have a groupInvites/{token} doc so invite links resolve
 * with a simple get (no collection query). Safe to call for admins only.
 */
export const ensureGroupInviteMapping = async (
  group: Pick<GroupChat, 'id' | 'inviteToken' | 'admins' | 'createdBy'>,
  currentUserUid: string
): Promise<void> => {
  const token = (group.inviteToken || '').trim();
  if (!token || !group.id) return;

  const isAdmin =
    (group.admins || []).includes(currentUserUid) ||
    group.createdBy === currentUserUid;
  if (!isAdmin) return;

  try {
    const inviteRef = doc(db, 'groupInvites', token);
    const existing = await getDoc(inviteRef);
    if (existing.exists()) return;
    await writeGroupInviteMapping(token, group.id, currentUserUid);
  } catch (error) {
    console.warn('ensureGroupInviteMapping failed:', error);
  }
};

/**
 * Repair legacy group docs so list + invite join keep working:
 * - missing visibilityScope → 'all'
 * - missing inviteToken → generate one
 * - missing groupInvites mapping → write one
 */
export const ensureGroupJoinFields = async (
  group: GroupChat,
  currentUserUid: string
): Promise<GroupChat> => {
  const isAdmin =
    (group.admins || []).includes(currentUserUid) ||
    group.createdBy === currentUserUid;
  if (!isAdmin || !group.id) return group;

  const updates: Record<string, unknown> = {};
  let nextToken = (group.inviteToken || '').trim();
  let nextVisibility = group.visibilityScope;

  if (!nextVisibility) {
    nextVisibility = 'all';
    updates.visibilityScope = 'all';
  }

  if (!nextToken) {
    nextToken = generateInviteToken();
    updates.inviteToken = nextToken;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('ensureGroupJoinFields update failed:', error);
      return group;
    }
  }

  const repaired: GroupChat = {
    ...group,
    inviteToken: nextToken,
    visibilityScope: nextVisibility || 'all',
  };

  await ensureGroupInviteMapping(repaired, currentUserUid);
  return repaired;
};

/** Backfill join fields for every group the user admins (fire-and-forget). */
export const backfillGroupInviteMappings = (groups: GroupChat[], currentUserUid: string) => {
  for (const group of groups) {
    void ensureGroupJoinFields(group, currentUserUid);
  }
};

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

    // Create new group + invite mapping (so invite links resolve without a
    // collection query that security rules would reject for many users).
    const docRef = await addDoc(groupsRef, groupData);
    try {
      await writeGroupInviteMapping(groupData.inviteToken, docRef.id, creatorProfile.uid);
    } catch (inviteError) {
      console.error('Error writing group invite mapping:', inviteError);
      // Group still exists; invite lookup may fall back to legacy query.
    }
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
    try {
      await writeGroupInviteMapping(groupData.inviteToken, docRef.id, creatorProfile.uid);
    } catch (inviteError) {
      console.error('Error writing group invite mapping:', inviteError);
    }
    return docRef.id;
  } catch (error) {
    console.error('Error creating custom group chat:', error);
    throw error;
  }
};

/**
 * Get group chat by invite token
 */
export const getGroupByInviteToken = async (
  inviteToken: string,
  userProfile?: UserProfile | null
): Promise<GroupChat | null> => {
  // useParams already decodes once; tolerate accidental double-encoding.
  let token = (inviteToken || '').trim();
  try {
    if (token.includes('%')) token = decodeURIComponent(token);
  } catch {
    // keep raw token
  }
  if (!token) return null;

  const isPrivileged =
    !!userProfile &&
    (userProfile.role === 'volunteer' ||
      userProfile.role === 'ngo' ||
      userProfile.role === 'admin');

  // Preferred path: direct get on invite mapping (works for all signed-in roles).
  try {
    const inviteSnap = await getDoc(doc(db, 'groupInvites', token));
    if (inviteSnap.exists()) {
      const groupId = String(inviteSnap.data()?.groupId || '');
      if (!groupId) return null;
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (!groupSnap.exists()) return null;
      return { id: groupSnap.id, ...groupSnap.data() } as GroupChat;
    }
  } catch (mappingError) {
    console.warn('groupInvites lookup failed, trying legacy query:', mappingError);
  }

  // Legacy fallback: query groups by inviteToken.
  // Non-privileged users must filter visibilityScope so the query
  // satisfies security rules ("rules are not filters").
  const groupsRef = collection(db, 'groups');

  try {
    const legacyQuery = isPrivileged
      ? query(groupsRef, where('inviteToken', '==', token))
      : query(
          groupsRef,
          where('inviteToken', '==', token),
          where('visibilityScope', '==', 'all')
        );

    const snapshot = await getDocs(legacyQuery);
    if (!snapshot.empty) {
      const legacyDoc = snapshot.docs[0];
      const group = { id: legacyDoc.id, ...legacyDoc.data() } as GroupChat;
      // Best-effort backfill so next open uses the fast path.
      if (userProfile?.uid) {
        void ensureGroupInviteMapping(group, userProfile.uid);
      }
      return group;
    }
  } catch (legacyError) {
    console.warn('Legacy inviteToken==all query failed:', legacyError);
  }

  // Some legacy docs may omit visibilityScope. Privileged query already covered
  // both scopes; for supporters try a second unconstrained query only if the
  // first returned empty without error (won't work under rules) — skip.
  // Instead try inviteToken-only when privileged already failed above.
  if (!isPrivileged) {
    try {
      // Groups with missing visibilityScope are treated as public in rules (null).
      // Firestore equality on missing field won't match 'all', so try token-only
      // is not allowed for supporters. Nothing more we can do client-side.
    } catch {
      // no-op
    }
  }

  return null;
};

/**
 * Join group via invite token - with role-based visibility check
 */
export const joinGroupViaToken = async (
  inviteToken: string,
  userProfile: UserProfile
): Promise<void> => {
  try {
    const group = await getGroupByInviteToken(inviteToken, userProfile);
    
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
  const token = (inviteToken || '').trim();
  if (!token) {
    return `${window.location.origin}${import.meta.env.BASE_URL}#/chat/join/`;
  }

  // Keep origin + Vite base path so GitHub Pages (/Project-Vision/) links work.
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${origin}${normalizedBase}#/chat/join/${encodeURIComponent(token)}`;
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

    const oldToken = group.inviteToken;
    const newToken = generateInviteToken();
    await updateDoc(groupRef, {
      inviteToken: newToken,
      updatedAt: serverTimestamp(),
    });

    try {
      if (oldToken) {
        await deleteDoc(doc(db, 'groupInvites', oldToken));
      }
    } catch (deleteError) {
      // Old mapping may not exist for legacy groups.
      console.warn('Could not delete old group invite mapping:', deleteError);
    }

    try {
      // createdBy must be the regenerating admin (or original creator) so
      // groupInvites create rules accept the write.
      await writeGroupInviteMapping(newToken, groupId, currentUserUid);
    } catch (inviteError) {
      console.error('Error writing regenerated invite mapping:', inviteError);
    }

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
    
    const groups = snapshot.docs.map((groupDoc) => ({
      id: groupDoc.id,
      ...groupDoc.data(),
    })) as GroupChat[];

    // Repair legacy invite/visibility fields for groups this user admins.
    backfillGroupInviteMappings(groups, userUid);

    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
};
