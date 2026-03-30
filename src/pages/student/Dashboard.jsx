import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import {
  FileText, Star, Trophy, Upload, MessageSquare, ArrowUpRight,
  Zap, AlertCircle, Clock
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ notesCount: 0, points: 0, rank: null, openComplaints: 0 });
  const [recentNotes, setRecentNotes] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Approved notes count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');

      // User rank
      const { data: rankData } = await supabase
        .from('leaderboard')
        .select('rank')
        .eq('user_id', user.id)
        .single();

      // Open complaints count
      const { count: openComplaints } = await supabase
        .from('complaints')
        .select('id', { count: 'exact', head: true })
        .eq('submitted_by', user.id)
        .eq('status', 'open');

      setStats({
        notesCount: notesCount || 0,
        points: profile?.points || 0,
        rank: rankData?.rank ? Number(rankData.rank) : null,
        openComplaints: openComplaints || 0,
      });

      // Recent approved notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, subject, created_at, profiles:uploaded_by(full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentNotes(notes || []);

      // Recent messages from user's groups
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      const groupIds = (memberData || []).map(m => m.group_id);

      if (groupIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, content, created_at, profiles:sender_id(full_name), chat_groups:group_id(name)')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })
          .limit(3);
        setRecentMessages(msgs || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.points]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const statCards = [
    { label: 'Approved Notes', value: stats.notesCount, icon: FileText, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: 'Your Points', value: stats.points, icon: Star, color: 'text-gold-500', bg: 'bg-gold-50 dark:bg-gold-900/20' },
    { label: 'Your Rank', value: stats.rank ? `#${stats.rank}` : 'N/A', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Open Feedback', value: stats.openComplaints, icon: AlertCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Banner */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-gold-400/10 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-brand-200 text-sm font-medium mb-1">Welcome back,</p>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-white mb-2">{profile?.full_name || user?.email?.split('@')[0] || 'Scholar'} ✨</h1>
          <p className="text-brand-200 text-sm max-w-lg">Here&apos;s your activity overview. Keep uploading notes and engaging to climb the leaderboard!</p>
          <div className="flex gap-3 mt-5">
            <Link to="/notes" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium backdrop-blur-sm transition-colors border border-white/10">
              <Upload className="w-4 h-4" /> Upload Notes
            </Link>
            <Link to="/chat" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium backdrop-blur-sm transition-colors border border-white/10">
              <MessageSquare className="w-4 h-4" /> Join Chat
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={item} className="glass-card-hover p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Recent Messages</h2>
            <Zap className="w-5 h-5 text-gold-500" />
          </div>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent messages from your groups.</p>
          ) : (
            <div className="space-y-3">
              {recentMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {msg.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-semibold">{msg.profiles?.full_name}</span>
                      <span className="text-gray-400 text-xs ml-2">in #{msg.chat_groups?.name}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msg.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Trending Notes */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Recent Notes</h2>
            <Link to="/notes" className="text-brand-500 hover:text-brand-600 text-sm font-medium flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No approved notes yet.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map(note => (
                <div key={note.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{note.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {note.profiles?.full_name}</p>
                  </div>
                  {note.subject && <span className="badge-purple text-xs">{note.subject}</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Browse Notes', desc: 'Explore shared academic resources', icon: FileText, to: '/notes', color: 'from-brand-500 to-brand-700' },
          { label: 'Leaderboard', desc: 'See top contributors and your rank', icon: Trophy, to: '/leaderboard', color: 'from-gold-500 to-gold-700' },
          { label: 'Submit Feedback', desc: 'Report issues or suggest features', icon: MessageSquare, to: '/feedback', color: 'from-emerald-500 to-emerald-700' },
        ].map((action) => (
          <Link key={action.label} to={action.to} className="group">
            <div className="glass-card-hover p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{action.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-brand-500 transition-colors" />
            </div>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
