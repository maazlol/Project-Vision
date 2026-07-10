# Group Chat System - Quick Reference

## 📁 New Files Created

### Core Libraries
- **`lib/groupChat.ts`** - All Firestore operations for group management
- **`lib/useGroupChat.ts`** - React hook for group creation on posts

### UI Components  
- **`components/GroupChatPanel.tsx`** - Main chat interface (sidebar + messages)
- **`components/GroupInfoModal.tsx`** - Instagram-style group settings modal
- **`components/JoinGroupPage.tsx`** - Invite link landing page
- **`components/ExampleGroupChatImplementation.tsx`** - Usage examples

### Documentation
- **`GROUPCHAT_INTEGRATION_GUIDE.md`** - Complete integration guide
- **`GROUPCHAT_QUICK_REFERENCE.md`** - This file

## 🚀 Quick Start (5 minutes)

### 1. Route Setup
```typescript
// In your router (App.tsx or Router component)
import JoinGroupPage from './components/JoinGroupPage';
import GroupChatPanel from './components/GroupChatPanel';

<Route path="/chat/join/:inviteToken" element={<JoinGroupPage />} />
```

### 2. Add Chat Button to Navbar
```typescript
import { MessageCircle } from 'lucide-react';
import GroupChatPanel from './components/GroupChatPanel';

function Navbar() {
  const [showChat, setShowChat] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowChat(true)}>
        <MessageCircle />
      </button>
      <GroupChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
    </>
  );
}
```

### 3. Enable Group Chat on Posts
```typescript
import { useGroupChat } from '../lib/useGroupChat';

function CreatePost() {
  const [enableGroupChat, setEnableGroupChat] = useState(false);
  const { createGroupForPost, isCreating } = useGroupChat();

  const handlePublish = async (postData) => {
    const postId = await savePost(postData);
    
    if (enableGroupChat) {
      await createGroupForPost(postId, postData);
    }
  };

  return (
    <>
      <textarea placeholder="What's on your mind?" />
      <label>
        <input 
          type="checkbox" 
          checked={enableGroupChat}
          onChange={(e) => setEnableGroupChat(e.target.checked)}
        />
        Enable Group Chat
      </label>
      <button onClick={handlePublish} disabled={isCreating}>
        Publish
      </button>
    </>
  );
}
```

## 📚 API Reference

### Core Functions

#### Group Creation
```typescript
createGroupChat(postId, postData, creatorProfile) → Promise<string>
// Returns: groupId
```

#### Group Access
```typescript
getGroupByInviteToken(inviteToken) → Promise<GroupChat>
joinGroupViaToken(inviteToken, userProfile) → Promise<void>
getUserGroups(userUid) → Promise<GroupChat[]>
```

#### Group Management (Admin Only)
```typescript
updateGroupName(groupId, newName, currentUserUid) → Promise<void>
updateGroupPic(groupId, newPicUrl, currentUserUid) → Promise<void>
makeUserAdmin(groupId, userUidToPromote, currentUserUid) → Promise<void>
removeUserFromGroup(groupId, userUidToRemove, currentUserUid) → Promise<void>
regenerateInviteToken(groupId, currentUserUid) → Promise<string>
```

#### Member Actions
```typescript
sendGroupMessage(groupId, senderProfile, messageText) → Promise<void>
leaveGroup(groupId, currentUserUid) → Promise<void>
getGroupWithMembers(groupId, memberProfiles) → Promise<{group, members}>
```

#### Utilities
```typescript
generateGroupInviteLink(inviteToken) → string
generateInviteToken() → string
```

## 📊 Data Schema

### Groups Document
```json
{
  "groupId": "string",
  "groupName": "string",
  "groupPic": "url-string",
  "createdBy": "uid-string",
  "admins": ["uid1", "uid2"],
  "members": ["uid1", "uid2", "uid3"],
  "inviteToken": "unique-string",
  "visibilityScope": "all" | "volunteers",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastMessage": "string",
  "lastMessageAt": "Timestamp",
  "lastMessageSenderId": "uid",
  "lastMessageSenderName": "string"
}
```

### Messages Subcollection
```json
{
  "senderId": "uid",
  "senderName": "string",
  "senderAvatar": "url",
  "text": "message-text",
  "timestamp": "Timestamp"
}
```

## 🎯 Use Cases

### Use Case 1: Post with Group Chat
```
User writes post → Enables "Group Chat" toggle → 
Post published → Group created automatically → 
Invite link available for sharing
```

### Use Case 2: Join via Link
```
User receives invite link → Opens /chat/join/{token} → 
Shows group preview → User clicks "Join" → 
Added to members array → Redirected to group chat
```

### Use Case 3: Admin Management
```
Admin opens GroupInfoModal → 
- Edits group name/picture
- Promotes member to admin
- Removes members
- Regenerates invite link
```

### Use Case 4: Leave Group
```
Member clicks "Leave Group" → 
Removed from members/admins arrays → 
If was only admin, next member promoted → 
Redirected back to groups list
```

## 🔐 Security Rules (Firestore)

```bash
firebase deploy --only firestore:rules
```

Use the checked-in `firestore.rules` file as the source of truth. The current rules support admin-managed volunteer approval through `users/{uid}` role fields, volunteer-only group visibility through `role` or `isVolunteer`, creator-as-first-admin group creation, admin-only group management, and member-only group messages.

## 🎨 Components Reference

### GroupChatPanel
Main chat interface with sidebar + messaging
- Props: `isOpen`, `groupId`, `onClose`
- Features: Groups list, message thread, real-time updates

### GroupInfoModal
Instagram-style settings panel
- Props: `isOpen`, `group`, `members`, `currentUserUid`, `onClose`, `onGroupUpdated`
- Features: Member list, admin controls, invite link

### JoinGroupPage
Landing page for invite links
- Route: `/chat/join/:inviteToken`
- Shows group preview + join confirmation

## ⚙️ Configuration

### Tailwind CSS Requirements
Add to your `tailwind.config.js`:
```javascript
theme: {
  extend: {
    gridTemplateColumns: {
      '[320px_1fr]': '320px 1fr',
    },
  }
}
```

### Toast Notifications
Uses existing `useToast()` hook:
```typescript
const { showToast } = useToast();
showToast('Success message', 'success');
showToast('Error message', 'error');
```

## 🔧 Common Implementations

### Show Group Count in Navbar
```typescript
const [groupCount, setGroupCount] = useState(0);

useEffect(() => {
  if (currentUserUid) {
    getUserGroups(currentUserUid).then(g => setGroupCount(g.length));
  }
}, [currentUserUid]);

return <span className="badge">{groupCount}</span>;
```

### Share Invite Link
```typescript
const handleShare = async () => {
  const link = generateGroupInviteLink(group.inviteToken);
  if (navigator.share) {
    await navigator.share({ url: link, title: group.groupName });
  } else {
    navigator.clipboard.writeText(link);
  }
};
```

### Copy Invite Link to Clipboard
```typescript
const handleCopy = () => {
  const link = generateGroupInviteLink(group.inviteToken);
  navigator.clipboard.writeText(link);
  showToast('Link copied!', 'success');
};
```

## 📱 Mobile Responsiveness

All components are fully responsive:
- **Mobile**: Single column layout, collapsible sidebar
- **Tablet**: 2-column with sidebar
- **Desktop**: Full 2-column with expanded features

## Chat Message Rendering Behavior

Chat message surfaces should keep long content readable inside the available chat width:
- Message containers use `min-w-0` and hidden horizontal overflow so bubbles cannot push outside the chat panel.
- Message text uses preserved whitespace plus forced wrapping for long unbroken words, pasted IDs, and URLs.
- Sending clears the input immediately using the trimmed message captured before the async Firestore write.
- If the send fails, the captured message text is restored to the input so the user can retry.

Apply this pattern to all message UIs that render group or discussion text, including `GroupChatPanel`, `GroupChatDrawer`, `DiscussionDrawer`, `MessagesPage`, and post discussion panels.

## 🚨 Error Handling

```typescript
try {
  await updateGroupName(groupId, newName, uid);
} catch (error) {
  if (error.message.includes('admin')) {
    showToast('Admin access required', 'error');
  } else if (error.message.includes('not found')) {
    showToast('Group no longer exists', 'error');
  } else {
    showToast(error.message, 'error');
  }
}
```

## 📝 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Only admins can..." | User not admin | Promote to admin first |
| "Invalid invite link" | Token doesn't exist | Check URL |
| "You don't have access" | Visibility scope | Check volunteer status |
| "Not a member of group" | User not in members array | Join group first |

## 🔄 Refresh & Updates

To manually refresh group data:
```typescript
const [refreshTrigger, setRefreshTrigger] = useState(0);

// After making changes
setRefreshTrigger(t => t + 1);

// Use in effect dependencies
useEffect(() => {
  loadData();
}, [refreshTrigger]);
```

## 🎓 Next Steps

1. ✅ Copy all files to your project
2. ✅ Update Firestore security rules
3. ✅ Add routes to router
4. ✅ Integrate with Navbar
5. ✅ Add group chat toggle to post creation
6. ✅ Test all features
7. 🚀 Deploy!

## 📞 Support

- Check component JSDoc comments
- Review `ExampleGroupChatImplementation.tsx`
- Read `GROUPCHAT_INTEGRATION_GUIDE.md`
- Check browser console for errors

---

**Created for We3 Project**  
Instagram-style Group Chat System for Community Engagement
