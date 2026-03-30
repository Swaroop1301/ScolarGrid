import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle, XCircle, ExternalLink, Loader2, Clock } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function NotesModeration() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('notes')
          .select('id, title, description, file_url, subject, status, created_at, profiles:uploaded_by(full_name, avatar_url)')
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error: err } = await query;
        if (err) throw err;
        setNotes(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [filter]);

  const moderate = async (noteId, status) => {
    setProcessing(noteId);
    try {
      const { error: err } = await supabase
        .from('notes')
        .update({ status })
        .eq('id', noteId);
      if (err) throw err;
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, status } : n));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge-gold flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    if (status === 'approved') return <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
    return <span className="badge-red flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
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
          <h1 className="page-title">Notes Moderation</h1>
          <p className="page-subtitle">Review and moderate uploaded notes</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-dark-surface rounded-xl p-1">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-white dark:bg-dark-card text-brand-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </motion.div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {filter !== 'all' ? filter : ''} notes found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <motion.div key={note.id} variants={item} className="glass-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{note.title}</h3>
                    {statusBadge(note.status)}
                  </div>
                  {note.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{note.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>By: {note.profiles?.full_name || 'Unknown'}</span>
                    {note.subject && <span>· {note.subject}</span>}
                    <span>· {new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {note.file_url && (
                    <a href={note.file_url} target="_blank" rel="noreferrer" className="btn-ghost text-xs flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> View File
                    </a>
                  )}
                  {note.status === 'pending' && (
                    <>
                      <button
                        onClick={() => moderate(note.id, 'approved')}
                        disabled={processing === note.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                      >
                        {processing === note.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => moderate(note.id, 'rejected')}
                        disabled={processing === note.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
