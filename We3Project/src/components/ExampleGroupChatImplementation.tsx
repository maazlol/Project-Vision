/**
 * EXAMPLE IMPLEMENTATION
 * 
 * This file demonstrates how to integrate the group chat system
 * into your existing application. Use this as a reference for
 * integrating group chat features into your post creation and
 * display components.
 */

import React, { useState } from 'react';
import { MessageCircle, Share2, Copy } from 'lucide-react';
import { useGroupChat } from '../lib/useGroupChat';
import { generateGroupInviteLink } from '../lib/groupChat';
import GroupChatPanel from './GroupChatPanel';
import { useToast } from './Toast';

// ============================================================================
// EXAMPLE 1: Post Creation with Group Chat Toggle
// ============================================================================

interface ExampleCreatePostProps {
  onPostCreated?: (postId: string) => void;
}

export const ExampleCreatePostWithGroupChat: React.FC<ExampleCreatePostProps> = ({
  onPostCreated,
}) => {
  const [postContent, setPostContent] = useState('');
  const [enableGroupChat, setEnableGroupChat] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [groupInviteLink, setGroupInviteLink] = useState<string | null>(null);
  
  const { createGroupForPost, isCreating } = useGroupChat({
    onSuccess: (_, group) => {
      const link = generateGroupInviteLink(group.inviteToken);
      setGroupInviteLink(link);
      console.log('Group created with invite link:', link);
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
    },
  });
  
  const { showToast } = useToast();

  const handlePublish = async () => {
    if (!postContent.trim()) {
      showToast('Please write something', 'error');
      return;
    }

    setIsPublishing(true);

    try {
      // Simulate creating post in Firebase
      const postData = {
        title: postContent.slice(0, 50),
        text: postContent,
        userId: 'current-user-id',
        userName: 'Current User',
        createdAt: new Date(),
        discussionAudience: 'all',
      };

      // Post creation would happen here
      // const postRef = await db.collection('posts').add(postData);
      const mockPostId = 'post-' + Date.now();

      if (enableGroupChat) {
        // Create group chat for this post
        await createGroupForPost(mockPostId, postData);
      }

      showToast('Post published successfully!', 'success');
      setPostContent('');
      setEnableGroupChat(false);
      onPostCreated?.(mockPostId);
    } catch (error) {
      showToast('Failed to publish post', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Create a Post</h2>

      {/* Post Content */}
      <textarea
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        rows={4}
      />

      {/* Group Chat Toggle */}
      <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
        <input
          type="checkbox"
          id="enable-group-chat"
          checked={enableGroupChat}
          onChange={(e) => setEnableGroupChat(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="enable-group-chat" className="flex-1 text-white cursor-pointer flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Enable Group Chat
        </label>
        <span className="text-sm text-slate-400">
          Followers can join discussions
        </span>
      </div>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isPublishing || isCreating}
        className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
      >
        {isPublishing || isCreating ? 'Publishing...' : 'Publish Post'}
      </button>

      {/* Invite Link Display */}
      {groupInviteLink && (
        <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg space-y-2">
          <p className="text-sm font-medium text-green-300">
            ✓ Group chat created! Share this link:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={groupInviteLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-300"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(groupInviteLink);
                showToast('Link copied!', 'success');
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: Post Display with Group Chat Button
// ============================================================================

interface ExamplePostDisplayProps {
  postId: string;
  title: string;
  content: string;
  hasGroupChat?: boolean;
}

export const ExamplePostDisplay: React.FC<ExamplePostDisplayProps> = ({
  title,
  content,
  hasGroupChat = false,
}) => {
  const [showGroupChat, setShowGroupChat] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900 rounded-lg border border-slate-700">
      {/* Post Header */}
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>

      {/* Post Content */}
      <p className="text-slate-300 mb-4">{content}</p>

      {/* Actions */}
      <div className="flex gap-3">
        {hasGroupChat && (
          <>
            <button
              onClick={() => setShowGroupChat(true)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Join Group Chat
            </button>

            {/* Group Chat Panel */}
            <GroupChatPanel
              isOpen={showGroupChat}
              onClose={() => setShowGroupChat(false)}
            />
          </>
        )}

        <button className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: Navbar Integration
// ============================================================================

interface ExampleNavbarProps {
  userRole?: string;
}

export const ExampleNavbarWithGroupChat: React.FC<ExampleNavbarProps> = ({
  userRole = 'user',
}) => {
  const [showGroupChat, setShowGroupChat] = useState(false);
  const unreadCount = 0;

  return (
    <>
      <nav className="bg-slate-950 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-2xl font-bold text-white">We3</h1>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <a href="/" className="text-slate-300 hover:text-white transition-colors">
              Home
            </a>
            <a href="/explore" className="text-slate-300 hover:text-white transition-colors">
              Explore
            </a>

            {/* Group Chat Button */}
            <button
              onClick={() => setShowGroupChat(!showGroupChat)}
              className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors group"
              title="Group Chats"
            >
              <MessageCircle className="w-5 h-5 text-slate-300 group-hover:text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <span className="text-white text-sm">{userRole}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Group Chat Panel */}
      <GroupChatPanel
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
      />
    </>
  );
};

// ============================================================================
// EXAMPLE 4: Complete Dashboard Section
// ============================================================================

export const ExampleGroupChatDashboard: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Group Chats</h1>
          <p className="text-slate-400">Manage and join group discussions</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm">Active Groups</p>
            <p className="text-2xl font-bold text-white mt-2">5</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm">Total Members</p>
            <p className="text-2xl font-bold text-white mt-2">24</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm">New Messages</p>
            <p className="text-2xl font-bold text-white mt-2">12</p>
          </div>
        </div>

        {/* Recent Groups List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Recent Groups
            </h2>
          </div>

          <div className="divide-y divide-slate-700">
            {['Design Discussions', 'Feature Feedback', 'Bug Reports', 'Partnership'].map(
              (groupName, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedGroupId(`group-${idx}`);
                    setShowChat(true);
                  }}
                  className="w-full p-4 text-left hover:bg-slate-700 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{groupName}</p>
                      <p className="text-xs text-slate-400">12 members</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-400">5 new</p>
                    <p className="text-xs text-slate-500">2 hours ago</p>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Group Chat Panel */}
      <GroupChatPanel
        isOpen={showChat}
        groupId={selectedGroupId}
        onClose={() => setShowChat(false)}
      />
    </div>
  );
};

// ============================================================================
// Export as demo
// ============================================================================

export default ExampleCreatePostWithGroupChat;
