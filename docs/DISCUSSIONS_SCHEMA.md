# Project Vision Discussions Schema

## `posts/{postId}`

Existing post fields are unchanged. Discussion-enabled posts add:

```ts
{
  isDiscussionEnabled: boolean,
  discussionAudience: "all" | "restricted"
}
```

Use `"all"` for "For All People" and `"restricted"` for "For Volunteers & NGOs Only".

## `discussions/{postId}`

The discussion room id is the source post id, which makes joining idempotent.

```ts
{
  postId: string,
  postOwnerId: string,
  postOwnerName: string,
  postTitle: string,
  postText: string,
  postImageUrl: string,
  audience: "all" | "restricted",
  participants: string[],
  participantRoles: Record<uid, "supporter" | "volunteer" | "ngo" | "admin">,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastMessage: string,
  lastMessageAt: Timestamp | null,
  lastMessageSenderId: string,
  lastMessageSenderName: string
}
```

## `discussions/{postId}/messages/{messageId}`

```ts
{
  senderId: string,
  senderName: string,
  senderRole: string,
  text: string,
  timestamp: Timestamp
}
```

## Sidebar Query

```ts
query(
  collection(db, "discussions"),
  where("participants", "array-contains", profile.uid)
)
```

The app sorts by `lastMessageAt || updatedAt` on the client to avoid a composite index. Restricted rooms are also filtered by the current user's Firestore role before rendering.

## Access Control

Client checks live in `src/lib/discussions.ts`, but the enforced security model is `We3Project/firestore.rules`:

- only participants can read rooms and messages
- restricted rooms require `users/{uid}.role` to be `volunteer`, `ngo`, or `admin`, or `users/{uid}.isVolunteer == true`
- message creation requires `senderId == request.auth.uid`
- first join creates or updates `discussions/{postId}` with the user's uid in `participants`
- volunteer permissions are granted and revoked from the admin panel by updating the user's role fields in `users/{uid}`

## Message UI Behavior

Discussion and group chat message bubbles must remain inside the chat viewport on every responsive layout. Long pasted text, URLs, and unbroken strings should wrap onto the next line instead of causing horizontal scroll or escaping the bubble.

The current UI pattern is:

- chat scroll containers allow vertical scrolling and hide horizontal overflow
- message row and bubble wrappers include `min-w-0`
- bubble wrappers cap width and hide overflow
- text uses `white-space: pre-wrap`, `overflow-wrap: anywhere`, and `word-break: break-word`
- send handlers clear the input immediately after capturing the trimmed message text, then restore it only if the async send fails
