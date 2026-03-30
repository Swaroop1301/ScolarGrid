import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import {
  Users, FileText, MessageSquare, AlertCircle, BarChart3,
  ArrowUpRight, Clock, TrendingUp
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, notes: 0, pendingNotes: 0, openComplaints: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, notesRes, pendingRes, complaintsRes, eventsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('notes').select('id', { count: 'exact', head: true }),
          supabase.from('notes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('analytics_events')
            .select('id, event_type, created_at, metadata, profiles:user_id(full_name)')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setStats({
          users: usersRes.count || 0,
          notes: notesRes.count || 0,
          pendingNotes: pendingRes.count || 0,
          openComplaints: complaintsRes.count || 0,
        });
        setRecentEvents(eventsRes.data || []);
      } catch (err) {
        console.warn('Admin dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', to: '/admin/users' },
    { label: 'Total Notes', value: stats.notes, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', to: '/admin/notes' },
    { label: 'Pending Notes', value: stats.pendingNotes, icon: Clock, color: 'text-gold-500', bg: 'bg-gold-50 dark:bg-gold-900/20', to: '/admin/notes' },
    { label: 'Open Complaints', value: stats.openComplaints, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', to: '/admin/complaints' },
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
      <motion.div variants={item}>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview and analytics</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <motion.div variants={item} className="glass-card-hover p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <TrendingUp className="w-5 h-5 text-brand-500" />
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity logged yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-dark-border/30 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white"><span className="font-semibold">{event.profiles?.full_name || 'User'}</span> — {event.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="glass-card p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-5">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'Moderate Notes', desc: `${stats.pendingNotes} pending`, icon: FileText, to: '/admin/notes', color: 'from-brand-500 to-brand-700' },
              { label: 'Manage Groups', desc: 'Create & manage chat groups', icon: MessageSquare, to: '/admin/groups', color: 'from-emerald-500 to-emerald-700' },
              { label: 'Handle Complaints', desc: `${stats.openComplaints} open`, icon: AlertCircle, to: '/admin/complaints', color: 'from-gold-500 to-gold-700' },
              { label: 'View Analytics', desc: 'Deep dive into usage metrics', icon: BarChart3, to: '/admin/analytics', color: 'from-purple-500 to-purple-700' },
            ].map(action => (
              <Link key={action.label} to={action.to} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
