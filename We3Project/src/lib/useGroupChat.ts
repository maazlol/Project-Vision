import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useUserRole } from './useUserRole';
import { createGroupChat, generateGroupInviteLink, type GroupChat } from './groupChat';

interface UseGroupChatOptions {
  onSuccess?: (groupId: string, group: GroupChat) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to manage group chat creation and state
 * Use this when enabling group chat on a post
 */
export const useGroupChat = (options?: UseGroupChatOptions) => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<GroupChat | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const { profile } = useUserRole();
  const { showToast } = useToast();

  const createGroupForPost = async (postId: string, postData: any): Promise<string | null> => {
    if (!profile) {
      const err = new Error('User profile not loaded');
      setError(err);
      options?.onError?.(err);
      showToast('User not authenticated', 'error');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const groupId = await createGroupChat(postId, postData, profile);
      
      // Fetch the created group to return it
      const { db } = await import('./firebase');
      const { getDoc, doc } = await import('firebase/firestore');
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (groupDoc.exists()) {
        const group = { id: groupId, ...groupDoc.data() } as GroupChat;
        setCreatedGroup(group);
        
        const inviteLink = generateGroupInviteLink(group.inviteToken);
        showToast(`Group created! Invite link: ${inviteLink}`, 'success');
        
        options?.onSuccess?.(groupId, group);
        return groupId;
      }

      return groupId;
    } catch (err: any) {
      const error = new Error(err.message || 'Failed to create group');
      setError(error);
      options?.onError?.(error);
      showToast(error.message, 'error');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createdGroup,
    error,
    createGroupForPost,
  };
};

export default useGroupChat;
