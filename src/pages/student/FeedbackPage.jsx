import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logEvent } from '../../lib/analytics';
import { MessageCircle, Send, Clock, CheckCircle, Eye, Loader2, AlertCircle } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const STATUS_CONFIG = {
  open: { label: 'Open', badgeClass: 'badge-gold', icon: Clock },
  in_review: { label: 'In Review', badgeClass: 'badge-blue', icon: Eye },
  closed: { label: 'Closed', badgeClass: 'badge-green', icon: CheckCircle },
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('complaints')
        .select('id, title, description, status, admin_response, created_at')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setComplaints(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const { error: err } = await supabase.from('complaints').insert({
        submitted_by: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
      });
      if (err) throw err;
      setForm({ title: '', description: '' });
      setSuccessMsg('Feedback submitted successfully!');
      logEvent('complaint_submitted', { title: form.title.trim() });
      await fetchComplaints();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl mx-auto">
      <motion.div variants={item}>
        <h1 className="page-title">Feedback</h1>
        <p className="page-subtitle">Submit complaints or suggestions</p>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </motion.div>
      )}

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </motion.div>
      )}

      {/* Submit Form */}
      <motion.div variants={item} className="glass-card p-6">
        <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-500" /> New Feedback
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Subject / Title"
            className="input-field"
            required
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your feedback or issue in detail..."
            className="input-field resize-none"
            rows={4}
          />
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </motion.div>

      {/* Past Complaints */}
      <motion.div variants={item}>
        <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">Your Submissions</h2>
        {complaints.length === 0 ? (
          <div className="text-center py-12 text-gray-400 glass-card">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No feedback submitted yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              return (
                <motion.div key={c.id} variants={item} className="glass-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                    <span className={`${cfg.badgeClass} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{c.description}</p>}
                  <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>

                  {c.admin_response && (
                    <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800/30 rounded-xl">
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">Admin Response</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{c.admin_response}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
