import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Clock, Eye, CheckCircle, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const STATUS_CONFIG = {
  open: { label: 'Open', badgeClass: 'badge-gold', icon: Clock },
  in_review: { label: 'In Review', badgeClass: 'badge-blue', icon: Eye },
  closed: { label: 'Closed', badgeClass: 'badge-green', icon: CheckCircle },
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('complaints')
          .select('id, title, description, status, admin_response, created_at, profiles:submitted_by(full_name, avatar_url)')
          .order('created_at', { ascending: false });

        if (filter !== 'all') query = query.eq('status', filter);

        const { data, error: err } = await query;
        if (err) throw err;
        setComplaints(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [filter]);

  const handleRespond = async (complaintId) => {
    if (!newStatus) return;
    setSubmitting(true);
    try {
      const updateData = { status: newStatus };
      if (response.trim()) updateData.admin_response = response.trim();

      const { error: err } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);
      if (err) throw err;

      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, ...updateData } : c));
      setExpanded(null);
      setResponse('');
      setNewStatus('');
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Complaints</h1>
          <p className="page-subtitle">Review and respond to student feedback</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-dark-surface rounded-xl p-1">
          {['all', 'open', 'in_review', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-white dark:bg-dark-card text-brand-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </motion.div>
      )}

      {complaints.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {filter !== 'all' ? filter.replace('_', ' ') : ''} complaints found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
            const StatusIcon = cfg.icon;
            const isExpanded = expanded === c.id;

            return (
              <motion.div key={c.id} variants={item} className="glass-card overflow-hidden">
                <button
                  onClick={() => {
                    setExpanded(isExpanded ? null : c.id);
                    setNewStatus(c.status);
                    setResponse(c.admin_response || '');
                  }}
                  className="w-full text-left p-5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                      <span className={`${cfg.badgeClass} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>From: {c.profiles?.full_name || 'Unknown'}</span>
                      <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-dark-border/50 pt-4">
                        {c.description && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{c.description}</p>
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Update Status</label>
                          <select
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            className="input-field text-sm"
                          >
                            <option value="open">Open</option>
                            <option value="in_review">In Review</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Admin Response</label>
                          <textarea
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            placeholder="Write your response to the student..."
                            className="input-field resize-none"
                            rows={3}
                          />
                        </div>

                        <button
                          onClick={() => handleRespond(c.id)}
                          disabled={submitting}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {submitting ? 'Saving...' : 'Save Response'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
