import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Mail, Edit3, Save, Sun, Moon, Upload, Star, Award, Calendar, Trophy, Loader2 } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ full_name: '' });
  const [myRank, setMyRank] = useState(null);
  const [notesCount, setNotesCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name || '' });
    }
  }, [profile]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Rank
      const { data: rankData } = await supabase
        .from('leaderboard')
        .select('rank')
        .eq('user_id', user.id)
        .single();
      if (rankData) setMyRank(Number(rankData.rank));

      // Notes count
      const { count } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('uploaded_by', user.id);
      setNotesCount(count || 0);
    } catch (err) {
      console.warn('Stats fetch error:', err.message);
    }
  }, [user?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name.trim() })
        .eq('id', user.id);
      if (error) throw error;
      setMessage('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      setMessage('Avatar updated! Refresh to see the change.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const stats = [
    { label: 'Notes Uploaded', value: notesCount, icon: Upload },
    { label: 'Points', value: profile?.points || 0, icon: Star },
    { label: 'Rank', value: myRank ? `#${myRank}` : 'N/A', icon: Trophy },
    { label: 'Score', value: profile?.points || 0, icon: Award },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={item}><h1 className="page-title">Profile</h1><p className="page-subtitle">Manage your account</p></motion.div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl text-brand-600 dark:text-brand-400 text-sm">
          {message}
        </motion.div>
      )}

      {/* Profile Card */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-start gap-5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-premium flex items-center justify-center text-white text-3xl font-serif font-bold shadow-glow overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'S'
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input type="text" value={form.full_name} onChange={e => setForm({ full_name: e.target.value })} className="input-field" placeholder="Full name" />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">{profile?.full_name || 'Student'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="badge-purple">{profile?.role || 'student'}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <button onClick={() => setEditing(true)} className="btn-ghost text-sm mt-3 flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Edit Profile</button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className="w-5 h-5 text-brand-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Settings */}
      <motion.div variants={item} className="glass-card p-6">
        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">Preferences</h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-dark-border/50">
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p><p className="text-xs text-gray-500">Switch between dark and light mode</p></div>
          <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-surface text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors">
            {isDark ? <><Sun className="w-4 h-4 text-gold-400" /> Light</> : <><Moon className="w-4 h-4 text-brand-500" /> Dark</>}
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">Notifications</p><p className="text-xs text-gray-500">Email and push notifications</p></div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-500/50 rounded-full peer dark:bg-dark-surface peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
      </motion.div>
    </motion.div>
  );
}
