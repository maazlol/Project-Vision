# Group Chat System - Architecture & Design

## System Overview

The Instagram-style Group Chat system is a complete, modular solution for enabling collaborative discussions within the We3 platform. It combines Firestore real-time updates with a modern React UI following Instagram's design patterns.

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GroupChatPanel        GroupInfoModal      JoinGroupPage    │
│  ├─ Groups List        ├─ Member List     ├─ Auth Check    │
│  ├─ Messages View      ├─ Admin Panel     ├─ Visibility    │
│  └─ Input/Send         └─ Settings        └─ Join Logic    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    State Management                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  useGroupChat (Hook)     useUserRole (Hook)                 │
│  ├─ Create groups       ├─ User profile                     │
│  └─ Error handling      └─ Role-based access               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                 Firestore Operations Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  groupChat.ts - Core Functions                              │
│  ├─ Group Management    ├─ Access Control                   │
│  ├─ Message Handling    ├─ Invite System                    │
│  └─ Member Management   └─ Admin Operations                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                  Firebase Services                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Firebase Auth    Firestore    Firebase Storage             │
│  ├─ UID           ├─ Real-time ├─ Group Pictures           │
│  └─ Session       ├─ Documents └─ User Avatars             │
│                   └─ Queries                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. GroupChatPanel (Main Interface)
**Purpose**: Primary chat UI container  
**Responsibility**: 
- Display user's groups list
- Show message thread
- Handle message input and sending
- Coordinate with GroupInfoModal

**State Management**:
```typescript
const [groups, setGroups] = useState<GroupChat[]>([]);
const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null);
const [messages, setMessages] = useState<GroupMessage[]>([]);
const [members, setMembers] = useState<GroupMember[]>([]);
```

**Data Flow**:
```
Load Groups → Select Group → Load Messages → Subscribe to Real-time Updates
     ↓              ↓               ↓                    ↓
onSnapshot   Memoized selection  Load Members    Display updates
```

### 2. GroupInfoModal (Settings)
**Purpose**: Manage group settings and members  
**Responsibility**:
- Display group information
- List members with roles
- Admin controls (promote, remove)
- Invite link management

**Conditional Rendering**:
```
If isCurrentUserAdmin:
  ├─ Edit group name
  ├─ Edit group picture
  ├─ Promote members to admin
  ├─ Remove members
  └─ Regenerate invite token

Always:
  ├─ View member list
  └─ Leave group
```

### 3. JoinGroupPage (Invite Landing)
**Purpose**: Handle invite link interactions  
**Responsibility**:
- Verify invite token
- Check user authentication
- Validate visibility scope
- Add user to group

**Access Control Flow**:
```
Invalid Token → Error Page
Valid Token → Check Auth → Not logged in → Redirect to login
                          → Logged in → Check Scope
                                      → Volunteers only → Check role
                                      → Already member → Show status
                                      → Can join → Join
```

## Data Flow Architecture

### Group Creation Flow
```
User toggles "Enable Group Chat"
    ↓
Publishes post
    ↓
useGroupChat hook triggers createGroupChat()
    ↓
createGroupChat:
  - Checks if group exists for post
  - Generates inviteToken
  - Creates document in groups collection
  - Sets creator as admin + member
  - Returns groupId
    ↓
onSuccess callback
    ↓
generateGroupInviteLink creates shareable URL
    ↓
Toast shows link to user
```

### Message Send Flow
```
User types message and presses send
    ↓
handleSendMessage validates:
  - User exists
  - Message not empty
  - Not already sending
    ↓
sendGroupMessage:
  - Creates document in messages subcollection
  - Updates parent group with lastMessage info
    ↓
Firestore onSnapshot listener
    ↓
setMessages updates state
    ↓
Auto-scroll to latest
```

### Member Join Flow
```
User opens invite link: /chat/join/{inviteToken}
    ↓
JoinGroupPage loads
    ↓
getGroupByInviteToken:
  - Queries groups where inviteToken matches
  - Returns group document
    ↓
Display group preview
    ↓
User clicks "Join Group"
    ↓
joinGroupViaToken:
  - Validates visibility scope
  - Checks if already member
  - Uses arrayUnion to add UID to members[]
    ↓
Success: Redirect to /chat?group={groupId}
Error: Show error message
```

### Admin Action Flow
```
Admin opens GroupInfoModal
    ↓
For each non-admin member:
  Show promote/remove buttons
    ↓
User clicks action
    ↓
Function validates current user is admin
    ↓
Operation:
  Promote: arrayUnion(uid) to admins[]
  Remove: arrayRemove(uid) from members[] and admins[]
    ↓
Firestore updates
    ↓
onGroupUpdated callback
    ↓
Parent component refreshes
    ↓
Modal displays updated state
```

## Real-time Synchronization

### Firestore Listeners

**1. Groups List (GroupChatPanel)**
```typescript
onSnapshot(
  query(collection(db, 'groups'), where('members', 'array-contains', uid)),
  (snapshot) => {
    const groups = snapshot.docs.map(doc => doc.data());
    setGroups(groups.sort(byLatestMessage));
  }
);
```

**2. Messages (GroupChatPanel)**
```typescript
onSnapshot(
  query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('timestamp', 'asc')
  ),
  (snapshot) => {
    setMessages(snapshot.docs.map(doc => doc.data()));
    autoScrollToBottom();
  }
);
```

**3. Group Updates (GroupInfoModal)**
```typescript
// Triggered by onGroupUpdated callback
// Causes parent to refresh group data
// Modal re-renders with new state
```

## Security Architecture

### Authentication Layer
```
User Action → Firebase Auth Check → UID Required → Operation Proceeds
                                 → No Auth → Show login prompt
```

### Authorization Layer
```
Operation Type:
  Public (read messages): if uid in group.members
  Send message: if uid in group.members
  Edit settings: if uid in group.admins
  Remove member: if uid in group.admins
  Leave: always allowed
  Join: check visibility scope first
```

### Firestore Rules
`firestore.rules` is the source of truth. It applies least-privilege checks for group reads, creates, updates, messages, invite joins, and volunteer-only visibility.

## Performance Optimizations

### 1. Memoization
```typescript
const selectedGroup = useMemo(
  () => groups.find(g => g.id === selectedRoomId) || groups[0],
  [groups, selectedRoomId]
);
```
**Benefit**: Prevents unnecessary component re-renders

### 2. Efficient Subscriptions
```typescript
// Unsubscribe on unmount
useEffect(() => {
  const unsubscribe = onSnapshot(...);
  return () => unsubscribe();
}, [dependency]);
```
**Benefit**: Prevents memory leaks and duplicate listeners

### 3. Lazy Member Loading
```typescript
useEffect(() => {
  if (!selectedGroup) return; // Only fetch when group selected
  loadMembers();
}, [selectedGroup]);
```
**Benefit**: Fetches only when needed

### 4. Optimized Queries
```typescript
// Indexed query
where('members', 'array-contains', uid)

// Ordered query
orderBy('timestamp', 'asc')

// Combined
query(collection, where(...), orderBy(...))
```
**Benefit**: Firestore uses indexes efficiently

### 5. Pagination Ready
```typescript
// Current implementation loads all messages
// Can be optimized with:
query(
  ...,
  orderBy('timestamp', 'desc'),
  limit(50)
)
```

## Error Handling Strategy

### Level 1: Validation
```typescript
if (!newName.trim()) {
  throw new Error('Group name cannot be empty');
}
```

### Level 2: Authorization
```typescript
if (!group.admins.includes(currentUserUid)) {
  throw new Error('Only admins can change group name');
}
```

### Level 3: Firestore
```typescript
try {
  await updateDoc(groupRef, ...);
} catch (error) {
  if (error.code === 'permission-denied') {
    throw new Error('You do not have permission');
  }
}
```

### Level 4: UI Feedback
```typescript
try {
  await operation();
  showToast('Success!', 'success');
} catch (error) {
  showToast(error.message, 'error');
}
```

## State Management Patterns

### Local Component State
Used for: UI state (editing, loading, selections)
```typescript
const [editingName, setEditingName] = useState(false);
const [loading, setLoading] = useState(false);
```

### Real-time Firestore State
Used for: Data that needs live updates
```typescript
const [messages, setMessages] = useState([]);
onSnapshot(query, (snapshot) => {
  setMessages(snapshot.docs.map(doc => doc.data()));
});
```

### Derived State
Used for: Computed values
```typescript
const isCurrentUserAdmin = group.admins.includes(currentUserUid);
const inviteLink = generateGroupInviteLink(group.inviteToken);
```

## Testing Strategy

### Unit Tests (Recommended)
```typescript
describe('groupChat', () => {
  test('createGroupChat creates group with correct structure', () => {});
  test('joinGroupViaToken respects visibility scope', () => {});
  test('leaveGroup promotes next admin if needed', () => {});
});
```

### Integration Tests (Recommended)
```typescript
describe('GroupChatPanel', () => {
  test('loads user groups on mount', () => {});
  test('sends message and updates display', () => {});
  test('allows admin to remove member', () => {});
});
```

### E2E Tests (Recommended)
```typescript
describe('Group Chat Flow', () => {
  test('complete flow: create → share → join → message', () => {});
});
```

## Scalability Considerations

### Current Limitations
- Loads all messages in memory (use pagination for large chats)
- Loads all members simultaneously (use virtualization for 1000+ members)
- No caching beyond Firestore's built-in caching

### Future Enhancements
1. **Pagination**: Load 50 messages at a time
2. **Virtualization**: Only render visible members
3. **Caching**: Redux/TanStack Query for offline support
4. **Compression**: Archive old messages
5. **Sharding**: Split large groups into subcollections

## Mobile Considerations

### Responsive Design
```css
/* Mobile: 1 column */
grid-cols-1

/* Desktop: 2 columns */
md:grid-cols-[320px_1fr]
```

### Touch Optimizations
- Larger tap targets (p-3, p-4)
- Swipe support for actions (left/right swipe)
- Keyboard auto-close on send

### Performance
- Lazy image loading for avatars
- Efficient message rendering
- Reduced animations on low-end devices

## Deployment Checklist

- [ ] Deploy `firestore.rules`
- [ ] Enable Email authentication (if needed)
- [ ] Configure storage bucket (for group pictures)
- [ ] Add routes to production build
- [ ] Test on mobile devices
- [ ] Monitor Firestore usage/costs
- [ ] Set up error logging (Sentry)
- [ ] Enable Firebase monitoring

## Cost Optimization

### Firestore Usage
```
Reads: ~10 per user per session (initial load)
Writes: ~1 per message + ~1 per action
Real-time listeners: continuous but cheap
```

### Storage
```
Group pictures: Stored in Firestore (URL string)
Can offload to Cloud Storage if needed
```

### Bandwidth
```
Minimal: JSON only, no files
Real-time subscriptions are efficient
```

## Monitoring & Logging

### Recommended Metrics
- Messages per group per day
- New groups created per day
- User retention in groups
- Average group size
- Error rates per operation

### Recommended Logging
```typescript
console.log('Group created:', groupId);
console.error('Failed to join group:', error);
// Consider: Firebase Analytics integration
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
