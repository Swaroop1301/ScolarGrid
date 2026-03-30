import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logEvent } from '../../lib/analytics';
import { MessageSquare, Send, Users, Hash, Loader2 } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Fetch user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('group_members')
          .select('group_id, chat_groups(id, name, description)')
          .eq('user_id', user.id);
        if (err) throw err;
        const grps = (data || []).map(d => d.chat_groups).filter(Boolean);
        setGroups(grps);
        if (grps.length > 0 && !selectedGroup) setSelectedGroup(grps[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchGroups();
  }, [user?.id]);

  // Fetch messages when group is selected
  const fetchMessages = useCallback(async () => {
    if (!selectedGroup) return;
    setMsgLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, profiles:sender_id(full_name, avatar_url)')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (err) throw err;
      setMessages(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setMsgLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`messages:${selectedGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${selectedGroup.id}`,
      }, async (payload) => {
        // Fetch the sender profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();
        const enriched = { ...payload.new, profiles: profile };
        setMessages(prev => [...prev, enriched]);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroup]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || sending) return;
    setSending(true);
    try {
      const { error: err } = await supabase.from('messages').insert({
        group_id: selectedGroup.id,
        sender_id: user.id,
        content: newMessage.trim(),
      });
      if (err) throw err;
      setNewMessage('');
      logEvent('message_sent', { group_id: selectedGroup.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-1">No groups yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">You haven&apos;t been added to any chat groups. Ask an admin to add you.</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Group List Sidebar */}
      <motion.div variants={item} className="w-72 glass-card flex flex-col flex-shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border/50">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" /> Groups
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                selectedGroup?.id === g.id
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{g.name}</span>
              </div>
              {g.description && <p className="text-xs text-gray-400 mt-0.5 truncate pl-6">{g.description}</p>}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Mobile group selector */}
      <div className="lg:hidden mb-3 w-full">
        <select
          value={selectedGroup?.id || ''}
          onChange={e => setSelectedGroup(groups.find(g => g.id === e.target.value))}
          className="input-field"
        >
          {groups.map(g => <option key={g.id} value={g.id}># {g.name}</option>)}
        </select>
      </div>

      {/* Chat Area */}
      <motion.div variants={item} className="flex-1 glass-card flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-dark-border/50 flex items-center gap-3">
          <Hash className="w-5 h-5 text-brand-500" />
          <h2 className="font-serif font-bold text-gray-900 dark:text-white">{selectedGroup?.name}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white ${isOwn ? 'bg-gradient-premium' : 'bg-gradient-gold'}`}>
                    {msg.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                    <p className="text-xs text-gray-400 mb-1">{msg.profiles?.full_name || 'Unknown'} · {formatTime(msg.created_at)}</p>
                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                      isOwn
                        ? 'bg-brand-500 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-gray-100 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Send */}
        {error && <p className="px-4 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-dark-border/50 flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !newMessage.trim()} className="btn-primary px-4 flex items-center gap-2 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
