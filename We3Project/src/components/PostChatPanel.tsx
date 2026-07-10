import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { X, Send, Lock, MessageSquare } from 'lucide-react';
import { useUserRole } from '../lib/useUserRole';
import { formatDistanceToNow } from 'date-fns';

interface PostChatPanelProps {
  post: any;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: any;
}

const PostChatPanel: React.FC<PostChatPanelProps> = ({ post, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { profile } = useUserRole();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAuthorized = profile && (profile.role === 'ngo' || profile.role === 'volunteer');
  const chatId = post.chatId || post.id;

  // Slide-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle closing with slide-out transition
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  // Real-time messages listener
  useEffect(() => {
    if (!chatId || !isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'posts', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching discussion messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, isAuthorized]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await addDoc(collection(db, 'posts', chatId, 'messages'), {
        senderId: profile.uid,
        senderName: profile.displayName || profile.name || 'User',
        senderRole: profile.role,
        text: textToSend,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending message:", e);
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ngo') {
      return (
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          NGO
        </span>
      );
    }
    if (role === 'volunteer') {
      return (
        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Volunteer
        </span>
      );
    }
    return null;
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return 'Sending...';
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Chat Panel */}
      <div 
        className={`fixed bg-white z-[51] flex flex-col shadow-2xl transition-transform duration-300 ease-out bottom-0 left-0 w-full h-[75vh] rounded-t-2xl md:right-0 md:top-0 md:h-full md:w-[420px] md:bottom-auto md:left-auto md:rounded-l-2xl md:rounded-t-none ${
          isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50/50 md:rounded-tl-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div className="max-w-[260px] md:max-w-[280px]">
              <h3 className="font-extrabold text-gray-900 text-sm leading-snug truncate">
                Discussion Room
              </h3>
              <p className="text-xs text-gray-500 truncate">
                Post by {post.userName}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Post Summary banner */}
        <div className="bg-emerald-50/40 px-4 py-2 text-xs border-b border-gray-100 text-emerald-800 shrink-0 italic truncate">
          "{post.text}"
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {!isAuthorized ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <Lock size={24} />
              </div>
              <h4 className="font-bold text-gray-800">Access Restricted</h4>
              <p className="text-xs text-gray-500 max-w-xs">
                This discussion room is only accessible to authenticated NGOs and Volunteers. Please sign in with an NGO or Volunteer account to participate.
              </p>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
              <p className="text-xs text-gray-400">Loading discussion...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <h4 className="font-bold text-slate-800">No messages yet</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Be the first to start the discussion for this post.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === auth.currentUser?.uid;
                return (
                  <div 
                    key={msg.id} 
                    className={`flex min-w-0 flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-gray-700">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      {getRoleBadge(msg.senderRole)}
                    </div>

                    <div 
                      className={`max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-normal shadow-sm ${
                        isMe 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                        {msg.text}
                      </p>
                    </div>

                    <span className="text-[9px] text-gray-400 font-medium mt-1 px-1">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Footer */}
        {isAuthorized && (
          <div className="p-3 border-t border-gray-100 bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:hover:shadow-none"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default PostChatPanel;
