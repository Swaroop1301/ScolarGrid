import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Trophy, Medal, Crown, Star } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('leaderboard')
          .select('user_id, full_name, avatar_url, points, rank')
          .limit(50);
        if (err) throw err;
        setEntries(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 text-center text-sm font-bold text-gray-500 dark:text-gray-400">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-gold-50 to-gold-100/50 dark:from-gold-900/20 dark:to-gold-900/10 border-gold-200 dark:border-gold-800/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-800/20 border-gray-200 dark:border-gray-700/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/30';
    return '';
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
      <motion.div variants={item}>
        <h1 className="page-title flex items-center gap-3"><Trophy className="w-8 h-8 text-gold-500" /> Leaderboard</h1>
        <p className="page-subtitle">Top contributors ranked by points</p>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </motion.div>
      )}

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <motion.div variants={item} className="grid grid-cols-3 gap-4">
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            const rank = [2, 1, 3][i];
            const sizes = ['h-28', 'h-36', 'h-24'];
            const avatarSizes = ['w-14 h-14', 'w-18 h-18', 'w-12 h-12'];
            return (
              <div key={e.user_id} className="flex flex-col items-center">
                <div className={`${avatarSizes[i]} rounded-full bg-gradient-premium flex items-center justify-center text-white font-bold text-lg mb-2 ${e.user_id === user?.id ? 'ring-4 ring-brand-400 ring-offset-2 dark:ring-offset-dark-bg' : ''}`}>
                  {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : e.full_name?.charAt(0) || '?'}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white text-center truncate max-w-full">{e.full_name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                  <span className="text-sm font-bold text-gold-600 dark:text-gold-400">{e.points}</span>
                </div>
                <div className={`${sizes[i]} w-full mt-3 rounded-t-2xl bg-gradient-to-t from-brand-500/20 to-brand-500/5 dark:from-brand-500/10 dark:to-transparent flex items-start justify-center pt-3`}>
                  {getRankIcon(rank)}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Full List */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-dark-surface text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-7">Student</div>
          <div className="col-span-4 text-right">Points</div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-border/50">
          {entries.map(e => (
            <div
              key={e.user_id}
              className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors hover:bg-gray-50 dark:hover:bg-dark-hover ${
                e.user_id === user?.id ? 'bg-brand-50/50 dark:bg-brand-900/10 border-l-4 border-brand-500' : ''
              } ${getRankBg(Number(e.rank))}`}
            >
              <div className="col-span-1 flex items-center">
                {getRankIcon(Number(e.rank))}
              </div>
              <div className="col-span-7 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : e.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {e.full_name}{e.user_id === user?.id && <span className="text-brand-500 ml-2 text-xs">(You)</span>}
                </span>
              </div>
              <div className="col-span-4 text-right">
                <span className="text-sm font-bold text-gold-600 dark:text-gold-400 flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                  {e.points}
                </span>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No students on the leaderboard yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
