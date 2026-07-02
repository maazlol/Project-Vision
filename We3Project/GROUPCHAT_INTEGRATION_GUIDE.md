# Instagram-Style Group Chat System - Integration Guide

## Overview
This guide explains how to integrate the new Instagram-style group chat system into your existing We3 application.

## Architecture

### New Files Created
- **`lib/groupChat.ts`** - Core Firestore operations and data types
- **`lib/useGroupChat.ts`** - React hook for group chat creation
- **`components/GroupChatPanel.tsx`** - Main group chat UI component
- **`components/GroupInfoModal.tsx`** - Group settings/info modal
- **`components/JoinGroupPage.tsx`** - Invite link landing page

### Firestore Collections Structure
```
groups/
  {groupId}/
    groupId: string
    groupName: string
    groupPic: string
    createdBy: string (UID)
    admins: string[] (UIDs)
    members: string[] (UIDs)
    inviteToken: string
    visibilityScope: 'all' | 'volunteers'
    createdAt: Timestamp
    updatedAt: Timestamp
    lastMessage: string
    lastMessageAt: Timestamp
    messages/
      {messageId}/
        senderId: string
        senderName: string
        senderAvatar: string
        text: string
        timestamp: Timestamp
```

## Step-by-Step Integration

### Step 1: Deploy Firestore Security Rules
The current production rules are already maintained in `firestore.rules`. Do not copy the simplified snippets from older notes; deploy the repo's rules file instead:

```bash
firebase deploy --only firestore:rules
```

The group-chat rules in `firestore.rules` enforce:

- signed-in users only
- creator must be the first member and first admin
- volunteer-only groups require `users/{uid}.role` to be `volunteer`, `ngo`, or `admin`, or `users/{uid}.isVolunteer == true`
- group admins can edit group settings and manage members
- members can send messages, join allowed groups, and leave groups

### Step 2: Update App Routing (App.tsx or your router)

```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GroupChatPanel from './components/GroupChatPanel';
import JoinGroupPage from './components/JoinGroupPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Existing routes */}
        <Route path="/chat" element={<GroupChatLayout />} />
        <Route path="/chat/join/:inviteToken" element={<JoinGroupPage />} />
        {/* Other routes */}
      </Routes>
    </Router>
  );
}

// Component to manage group chat panel state
function GroupChatLayout() {
  const [showChat, setShowChat] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <Layout>
      {/* Your existing content */}
      <GroupChatPanel
        isOpen={showChat}
        groupId={selectedGroupId}
        onClose={() => setShowChat(false)}
      />
    </Layout>
  );
}
```

### Step 3: Enable Group Chat on Posts

In your Post component or wherever you handle post creation, add group chat toggle:

```typescript
import { useGroupChat } from '../lib/useGroupChat';
import { useToast } from './Toast';

function CreatePost() {
  const [enableGroupChat, setEnableGroupChat] = useState(false);
  const { createGroupForPost, isCreating } = useGroupChat({
    onSuccess: (groupId, group) => {
      console.log('Group created:', groupId);
      // You can show the invite link to the user here
    },
  });

  const handlePublishPost = async (postData: any) => {
    const post = await db.collection('posts').add(postData);
    
    if (enableGroupChat) {
      await createGroupForPost(post.id, postData);
    }
  };

  return (
    <div>
      {/* Your post creation form */}
      
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enableGroupChat}
          onChange={(e) => setEnableGroupChat(e.target.checked)}
        />
        <span>Enable Group Chat</span>
      </label>

      <button
        onClick={() => handlePublishPost(postData)}
        disabled={isCreating}
      >
        {isCreating ? 'Creating group...' : 'Publish'}
      </button>
    </div>
  );
}
```

### Step 4: Add Group Chat Button to Navigation

In your Navbar component:

```typescript
import { MessageCircle } from 'lucide-react';

function Navbar() {
  const [showGroupChat, setShowGroupChat] = useState(false);

  return (
    <nav className="flex items-center gap-4">
      {/* Existing nav items */}
      
      <button
        onClick={() => setShowGroupChat(!showGroupChat)}
        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        title="Group Chats"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Group Chat Panel */}
      <GroupChatPanel
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
      />
    </nav>
  );
}
```

### Step 5: Update imports in relevant files

Make sure your components have the correct imports:

```typescript
import { auth, db } from '../lib/firebase';
import { useUserRole } from '../lib/useUserRole';
import { useToast } from './Toast';
import GroupChatPanel from './GroupChatPanel';
import GroupInfoModal from './GroupInfoModal';
```

## Key Features & How They Work

### 1. Group Creation
When a user enables group chat on a post:
- Automatically creates a document in `groups` collection
- Creator is added to both `admins` and `members` arrays
- Unique `inviteToken` is generated

```typescript
// Example usage
const groupId = await createGroupChat(postId, postData, userProfile);
```

### 2. Group Joining via Invite Link
Users click invite link → lands on `/chat/join/{inviteToken}`:
- System checks visibility scope
- For 'volunteers' scope, only allows volunteers/NGOs/admins
- Adds user to `members` array via `arrayUnion`

```typescript
// Firestore operation
await updateDoc(groupRef, {
  members: arrayUnion(userProfile.uid)
});
```

### 3. Admin Management
Only admins can:
- Edit group name and picture
- Promote members to admin
- Remove members from group
- Regenerate invite links

### 4. Member Self-Actions
All users can:
- View group members and their roles
- Leave the group
- If last admin leaves, next member auto-promoted

```typescript
// Leave group - auto-promotes next member to admin if needed
await leaveGroup(groupId, currentUserUid);
```

## Usage Examples

### Enabling Group Chat on a Post
```typescript
import { useGroupChat } from '../lib/useGroupChat';

function CreatePostForm() {
  const [enableGroupChat, setEnableGroupChat] = useState(false);
  const { createGroupForPost, isCreating } = useGroupChat();

  const handleSubmit = async () => {
    const postId = await createPost(postData);
    
    if (enableGroupChat) {
      const groupId = await createGroupForPost(postId, postData);
      // Show success message with invite link
    }
  };

  return (
    <form>
      <input type="text" placeholder="Post content" />
      <label>
        <input
          type="checkbox"
          checked={enableGroupChat}
          onChange={(e) => setEnableGroupChat(e.target.checked)}
        />
        Enable Group Chat
      </label>
      <button disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Publish'}
      </button>
    </form>
  );
}
```

### Sharing Invite Link
```typescript
import { generateGroupInviteLink } from '../lib/groupChat';

function ShareGroupButton({ group }) {
  const inviteLink = generateGroupInviteLink(group.inviteToken);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Join ${group.groupName}`,
        text: `Join our group discussion!`,
        url: inviteLink,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(inviteLink);
    }
  };

  return <button onClick={handleShare}>Share Invite</button>;
}
```

### Accessing Group Info
```typescript
import { getGroupWithMembers } from '../lib/groupChat';

async function loadGroupDetails(groupId) {
  const memberProfiles = {}; // Fetch user profiles
  const { group, members } = await getGroupWithMembers(groupId, memberProfiles);
  
  console.log('Group:', group);
  console.log('Members:', members);
}
```

## UI Components Integration Points

### GroupChatPanel Props
```typescript
interface GroupChatPanelProps {
  isOpen: boolean;           // Control panel visibility
  groupId?: string | null;   // Pre-select a group
  onClose: () => void;       // Close handler
}
```

### GroupInfoModal Props
```typescript
interface GroupInfoModalProps {
  isOpen: boolean;
  group: GroupChat | null;
  members: GroupMember[];
  currentUserUid: string;
  onClose: () => void;
  onGroupUpdated?: () => void;  // Refresh parent on updates
}
```

## Security & Permissions

### Admin-Only Operations
```typescript
// These functions check isAdmin internally
- updateGroupName(groupId, newName, currentUserUid)
- updateGroupPic(groupId, newPicUrl, currentUserUid)
- makeUserAdmin(groupId, userToPromote, currentUserUid)
- removeUserFromGroup(groupId, userToRemove, currentUserUid)
- regenerateInviteToken(groupId, currentUserUid)
```

### Public Operations
```typescript
// Available to all members
- sendGroupMessage(groupId, senderProfile, messageText)
- getGroupByInviteToken(inviteToken)
- leaveGroup(groupId, currentUserUid)
```

## Error Handling

All functions throw descriptive errors. Wrap calls in try-catch:

```typescript
try {
  await updateGroupName(groupId, newName, currentUserUid);
  showToast('Name updated!', 'success');
} catch (error) {
  // Errors include:
  // - "Only admins can change group name"
  // - "Group not found"
  // - Network errors
  showToast(error.message, 'error');
}
```

## Toast Notifications

The system uses your existing `useToast` hook:

```typescript
const { showToast } = useToast();

// Success
showToast('Group created successfully', 'success');

// Error
showToast('Failed to create group', 'error');

// Info
showToast('Invite link copied', 'info');
```

## Performance Optimizations

1. **Lazy Loading**: Messages load on demand with `orderBy('timestamp', 'asc')`
2. **Real-time Updates**: Uses Firestore `onSnapshot` for instant updates
3. **Memoization**: Components use `useMemo` to prevent unnecessary re-renders
4. **Pagination Ready**: Can add message pagination by modifying the query

## Tailwind CSS Requirements

Ensure your Tailwind config supports the following utilities:
- `grid-cols-[320px_1fr]` (for sidebar)
- `max-w-4xl` (for modal)
- `rounded-2xl`, `rounded-full` (for modern UI)
- `bg-gradient-to-br` (for avatars)
- `backdrop-blur-sm` (for modals)

## Testing Checklist

- [ ] Create a group on a post
- [ ] Copy and share invite link
- [ ] Join group as different user
- [ ] Send messages
- [ ] Promote member to admin
- [ ] Remove member
- [ ] Update group name/picture
- [ ] Leave group
- [ ] Test visibility scope (volunteers only)
- [ ] Test last admin scenario

## Troubleshooting

### Groups not showing up
- Check Firestore security rules
- Verify user is in `members` array
- Check browser console for errors

### Messages not sending
- Verify user is authenticated
- Check Firestore permissions
- Ensure message text is not empty

### Invite link not working
- Verify invite token exists in group document
- Check if user is already a member
- Verify visibility scope permissions

### Members not appearing
- Ensure user profiles exist in `users` collection
- Check if member UIDs are valid
- Verify Firestore read permissions

## Next Steps

1. **Add message reactions** - Emoji reactions on messages
2. **File/Image sharing** - Upload media to messages
3. **Member typing indicators** - Show who's typing
4. **Group search** - Search messages and groups
5. **Group notifications** - Firebase Cloud Messaging integration
6. **Message pinning** - Pin important messages
7. **Thread replies** - Reply to specific messages

## Support & Questions

Refer to:
- `lib/groupChat.ts` for API reference
- Component JSDoc comments
- Firestore documentation for security rules
- Firebase v9+ modular SDK docs
