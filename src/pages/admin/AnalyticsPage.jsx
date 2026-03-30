import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, Users, FileText, MessageSquare, Trophy, Star, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState({ dau: 0, notesThisWeek: 0, messagesThisWeek: 0 });
  const [chartData, setChartData] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

        // KPIs
        const [dauRes, notesWeekRes, msgsWeekRes] = await Promise.all([
          supabase.from('analytics_events').select('user_id', { count: 'exact' }).gte('created_at', dayAgo),
          supabase.from('notes').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
          supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        ]);

        // Count distinct user_ids for DAU
        const distinctUsers = new Set((dauRes.data || []).map(e => e.user_id));

        setKpis({
          dau: distinctUsers.size,
          notesThisWeek: notesWeekRes.count || 0,
          messagesThisWeek: msgsWeekRes.count || 0,
        });

        // Chart data: events in last 30 days
        const { data: events } = await supabase
          .from('analytics_events')
          .select('event_type, created_at')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: true });

        // Group by date
        const dateMap = {};
        (events || []).forEach(e => {
          const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!dateMap[date]) dateMap[date] = { date, login: 0, note_download: 0, message_sent: 0, complaint_submitted: 0, other: 0 };
          if (dateMap[date][e.event_type] !== undefined) {
            dateMap[date][e.event_type]++;
          } else {
            dateMap[date].other++;
          }
        });
        setChartData(Object.values(dateMap));

        // Top 10 students
        const { data: top } = await supabase
          .from('leaderboard')
          .select('user_id, full_name, avatar_url, points, rank')
          .limit(10);
        setTopStudents(top || []);
      } catch (err) {
        console.warn('Analytics error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const kpiCards = [
    { label: 'Daily Active Users', value: kpis.dau, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { label: 'Notes This Week', value: kpis.notesThisWeek, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Messages This Week', value: kpis.messagesThisWeek, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
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
        <h1 className="page-title flex items-center gap-3"><BarChart3 className="w-8 h-8 text-brand-500" /> Analytics</h1>
        <p className="page-subtitle">Platform usage metrics and insights</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map(kpi => (
          <motion.div key={kpi.label} variants={item} className="glass-card p-5">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="glass-card p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" /> Events Over Time
          </h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No event data available yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A28', border: '1px solid #2A2A3C', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="login" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Logins" />
                <Bar dataKey="note_download" fill="#10B981" radius={[4, 4, 0, 0]} name="Downloads" />
                <Bar dataKey="message_sent" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-500" /> Top 10 Students
          </h2>
          {topStudents.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No students ranked yet</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map(s => (
                <div key={s.user_id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                  <span className="w-6 text-center text-sm font-bold text-gray-500">#{s.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : s.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{s.full_name}</span>
                  <span className="text-sm font-bold text-gold-600 dark:text-gold-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />{s.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
