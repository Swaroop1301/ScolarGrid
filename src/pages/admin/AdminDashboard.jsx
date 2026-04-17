import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchAnalytics } from '../../services/analyticsService';
import { fetchComplaints } from '../../services/complaintsService';
import { fetchLeaderboard } from '../../services/leaderboardService';
import { Users, FileText, Download, MessageSquare, AlertCircle, TrendingUp, ArrowUpRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [a, c, lb] = await Promise.all([
        fetchAnalytics(),
        fetchComplaints(null, true),
        fetchLeaderboard(10),
      ]);
      setAnalytics(a);
      setComplaints(c);
      setLeaderboard(lb);
    } catch (err) {
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-100 dark:bg-dark-surface animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-dark-surface animate-pulse" />)}
        </div>
      </div>
    );
  }

  const openComplaints = complaints.filter(c => c.status === 'Open').length;
  const stats = [
    { label: 'Total Users', value: analytics.totalUsers, change: '+12%', icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: 'Total Notes', value: analytics.totalNotes, change: '+8%', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Downloads', value: analytics.totalDownloads.toLocaleString(), change: '+24%', icon: Download, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Open Issues', value: openComplaints, change: `${analytics.resolvedComplaints} resolved`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="page-title">Management Dashboard</h1>
        <p className="page-subtitle">Overview of platform activity and administrative tasks</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} variants={item} className="glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {s.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">Activity Trends</h2>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {analytics.monthlyUploads.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(v / Math.max(...analytics.monthlyUploads, 1)) * 100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-brand-500 to-brand-400 rounded-t-lg min-h-[4px] relative group cursor-pointer"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-card text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{v} uploads</div>
                </motion.div>
                <span className="text-[10px] text-gray-400">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Top Subjects</h2>
          </div>
          <div className="space-y-3">
            {analytics.topSubjects.map((s, i) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.subject}</span>
                  <span className="text-xs text-gray-400">{s.count}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / Math.max(...analytics.topSubjects.map(x => x.count), 1)) * 100}%` }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Complaints & Top Contributors */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Recent Complaints</h2>
            <Link to="/admin/complaints" className="text-brand-500 text-sm font-medium flex items-center gap-1">View All <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {complaints.filter(c => c.status !== 'Resolved').slice(0, 4).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${c.priority === 'High' ? 'text-red-500' : 'text-gold-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">{c.userName}</p>
                </div>
                <span className={`badge text-xs ${c.status === 'Open' ? 'badge-blue' : 'badge-purple'}`}>{c.status}</span>
              </div>
            ))}
            {complaints.filter(c => c.status !== 'Resolved').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No open complaints 🎉</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Top Contributors</h2>
            <Link to="/admin/users" className="text-brand-500 text-sm font-medium flex items-center gap-1">View All <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {leaderboard.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 p-2">
                <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.tier}</p>
                </div>
                <span className="text-sm font-bold text-brand-500">{u.score}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No students yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
