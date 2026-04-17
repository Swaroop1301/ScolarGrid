import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { fetchUserGroups, joinGroup } from '../../services/groupsService';
import { fetchMessages, sendMessage, subscribeToMessages, deleteMessage } from '../../services/messagesService';

import { Search, Send, Paperclip, Hash, Users, Clock, Plus, X, Copy, Check, File, Trash2 } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export default function ChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await fetchUserGroups(user.id);
      setGroups(data);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when group changes
  useEffect(() => {
    if (!selectedGroup) return;
    loadMessages(selectedGroup.id);

    // Subscribe to new messages
    if (channelRef.current) {
      channelRef.current.close();
    }
    channelRef.current = subscribeToMessages(selectedGroup.id, (payload) => {
      if (payload.type === 'message_deleted') {
        setMessages(prev => prev.filter(m => m.id !== payload.payload.messageId));
      } else {
        const newMsg = payload;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [selectedGroup]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (groupId) => {
    try {
      const data = await fetchMessages(groupId);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchGroup.toLowerCase()));

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !user) return;
    const content = newMessage;
    setNewMessage('');
    try {
      const msg = await sendMessage(selectedGroup.id, user.id, content);
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(content); // Restore on error
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || !user) return;
    setJoining(true);
    setJoinError('');
    try {
      await joinGroup(user.id, joinCode);
      await loadGroups();
      setShowJoin(false);
      setJoinCode('');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message for everyone?')) return;
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex gap-4">
        <div className="w-80 rounded-2xl bg-gray-100 dark:bg-dark-surface animate-pulse" />
        <div className="flex-1 rounded-2xl bg-gray-100 dark:bg-dark-surface animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="h-[calc(100vh-7rem)] flex gap-4">
      {/* Groups Panel */}
      <div className={`${selectedGroup ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 glass-card overflow-hidden flex-shrink-0`}>
        <div className="p-4 border-b border-light-border dark:border-dark-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Chats</h2>
            <button onClick={() => setShowJoin(true)} className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchGroup} onChange={e => setSearchGroup(e.target.value)} placeholder="Search groups..." className="input-field pl-9 py-2 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 && (
            <div className="text-center py-8 px-4">
              <Hash className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No groups yet. Join one!</p>
            </div>
          )}
          {filteredGroups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-gray-50 dark:border-dark-border/30 ${
                selectedGroup?.id === group.id ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-dark-hover'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                <Hash className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(group.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{group.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> {group.members}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedGroup ? 'flex' : 'hidden lg:flex'} flex-1 flex-col glass-card overflow-hidden`}>
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 lg:px-6 py-4 border-b border-light-border dark:border-dark-border/50">
              <button onClick={() => setSelectedGroup(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center text-white">
                <Hash className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedGroup.name}</h3>
                <p className="text-xs text-gray-400">{selectedGroup.members} members</p>
              </div>
              <button onClick={() => copyCode(selectedGroup.joinCode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-dark-surface text-xs font-mono text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {selectedGroup.joinCode}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              )}
              {messages.map(msg => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                      {!isOwn && <p className="text-xs font-semibold text-brand-500 mb-1 ml-1">{msg.senderName}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-brand-500 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-gray-200 rounded-tl-sm'
                      }`}>
                        {msg.type === 'file' ? (
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4" />
                            <span className="text-sm">{msg.fileName || msg.content}</span>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(msg.timestamp)}
                        {['superadmin', 'faculty'].includes(user?.role) && (
                          <button onClick={() => handleDeleteMessage(msg.id)} className="ml-2 text-red-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="px-4 lg:px-6 py-4 border-t border-light-border dark:border-dark-border/50">
              <div className="flex items-center gap-3">
                <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-400">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-white mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a group from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Join Group Modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowJoin(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-light-surface dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-4">Join a Group</h2>
              {joinError && <p className="text-sm text-red-500 mb-3">{joinError}</p>}
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter join code (e.g., GRP-2026-XK9)" className="input-field font-mono mb-4" />
              <div className="flex gap-3">
                <button onClick={() => { setShowJoin(false); setJoinError(''); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleJoinGroup} disabled={joining} className="btn-primary flex-1">
                  {joining ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Join Group'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
