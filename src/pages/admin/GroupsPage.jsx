import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MessageSquare, Plus, Trash2, Users, Search,
  UserPlus, X, Loader2, Hash
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [addingMember, setAddingMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('chat_groups')
        .select('id, name, description, created_at, group_members(user_id)')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setGroups((data || []).map(g => ({ ...g, memberCount: g.group_members?.length || 0 })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    setCreating(true);
    try {
      const { error: err } = await supabase.from('chat_groups').insert({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || null,
        created_by: user.id,
      });
      if (err) throw err;
      setNewGroup({ name: '', description: '' });
      setShowCreate(false);
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!confirm('Delete this group? All messages will be lost.')) return;
    setDeleting(groupId);
    try {
      const { error: err } = await supabase.from('chat_groups').delete().eq('id', groupId);
      if (err) throw err;
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const searchUsers = async (query) => {
    setMemberSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch (err) {
      console.warn('Search error:', err.message);
    }
  };

  const addMember = async (groupId, userId) => {
    try {
      const { error: err } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: userId,
      });
      if (err) throw err;
      setAddingMember(null);
      setMemberSearch('');
      setSearchResults([]);
      await fetchGroups();
    } catch (err) {
      if (err.message.includes('duplicate')) {
        setError('User is already a member of this group.');
      } else {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Chat Groups</h1>
          <p className="page-subtitle">Create and manage discussion groups</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline text-xs">Dismiss</button>
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-x-4 top-[20%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white dark:bg-dark-card rounded-2xl shadow-2xl z-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Create Group</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <input type="text" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Group name *" className="input-field" required />
                <textarea value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Description (optional)" className="input-field resize-none" rows={3} />
                <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No groups created yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(g => (
            <motion.div key={g.id} variants={item} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAddingMember(addingMember === g.id ? null : g.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    title="Add member"
                  >
                    <UserPlus className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deleting === g.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete group"
                  >
                    {deleting === g.id ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{g.name}</h3>
              {g.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{g.description}</p>}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" /> {g.memberCount} members
              </div>

              {/* Add Member Panel */}
              <AnimatePresence>
                {addingMember === g.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border/50 overflow-hidden">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input type="text" value={memberSearch} onChange={e => searchUsers(e.target.value)} placeholder="Search users..." className="input-field pl-9 py-2 text-xs" />
                    </div>
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => addMember(g.id, u.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs">
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-gray-900 dark:text-white">{u.full_name}</span>
                        <UserPlus className="w-3 h-3 text-brand-500 ml-auto" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
