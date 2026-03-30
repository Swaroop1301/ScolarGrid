import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logEvent } from '../../lib/analytics';
import {
  FileText, Upload, Heart, Download, Search, Filter, X, Plus,
  Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Other'];

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [myPendingNotes, setMyPendingNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', subject: '', file: null });
  const [myInteractions, setMyInteractions] = useState({});

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch approved notes with uploader name
      const { data, error: fetchErr } = await supabase
        .from('notes')
        .select('id, title, description, file_url, subject, status, created_at, uploaded_by, profiles:uploaded_by(full_name, avatar_url)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      setNotes(data || []);

      // Fetch user's pending notes
      if (user?.id) {
        const { data: pending } = await supabase
          .from('notes')
          .select('id, title, description, file_url, subject, status, created_at')
          .eq('uploaded_by', user.id)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false });
        setMyPendingNotes(pending || []);

        // Fetch user's interactions
        const { data: interactions } = await supabase
          .from('note_interactions')
          .select('note_id, type')
          .eq('user_id', user.id);
        const map = {};
        (interactions || []).forEach(i => { map[`${i.note_id}_${i.type}`] = true; });
        setMyInteractions(map);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title.trim()) return;
    setUploading(true);
    setError('');
    try {
      const fileExt = uploadForm.file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: storageErr } = await supabase.storage
        .from('notes-files')
        .upload(filePath, uploadForm.file);
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage.from('notes-files').getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from('notes').insert({
        uploaded_by: user.id,
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || null,
        subject: uploadForm.subject || null,
        file_url: urlData.publicUrl,
      });
      if (insertErr) throw insertErr;

      setUploadForm({ title: '', description: '', subject: '', file: null });
      setShowUpload(false);
      await fetchNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (noteId) => {
    if (myInteractions[`${noteId}_like`]) return;
    try {
      const { error: err } = await supabase.from('note_interactions').upsert({
        note_id: noteId,
        user_id: user.id,
        type: 'like',
      }, { onConflict: 'note_id,user_id,type' });
      if (err) throw err;
      setMyInteractions(prev => ({ ...prev, [`${noteId}_like`]: true }));
    } catch (err) {
      console.warn('Like failed:', err.message);
    }
  };

  const handleDownload = async (note) => {
    try {
      await supabase.from('note_interactions').upsert({
        note_id: note.id,
        user_id: user.id,
        type: 'download',
      }, { onConflict: 'note_id,user_id,type' });
      setMyInteractions(prev => ({ ...prev, [`${note.id}_download`]: true }));
      logEvent('note_download', { note_id: note.id });
    } catch (err) {
      console.warn('Download log failed:', err.message);
    }
    window.open(note.file_url, '_blank');
  };

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = !subjectFilter || n.subject === subjectFilter;
    return matchSearch && matchSubject;
  });

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge-gold flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    if (status === 'rejected') return <span className="badge-red flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
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
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Browse and share academic resources</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Upload Note
        </button>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </motion.div>
      )}

      {/* Search & Filter */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="input-field pl-11" />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="input-field pl-11 pr-8 appearance-none min-w-[180px]">
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </motion.div>

      {/* My Pending Notes */}
      {myPendingNotes.length > 0 && (
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Your Submissions</h3>
          <div className="space-y-2">
            {myPendingNotes.map(n => (
              <div key={n.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-dark-surface">
                <span className="text-sm text-gray-900 dark:text-white font-medium">{n.title}</span>
                {statusBadge(n.status)}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Notes Grid */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(note => (
          <motion.div key={note.id} variants={item} className="glass-card-hover p-5 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-brand-500" />
              </div>
              {note.subject && <span className="badge-purple text-xs">{note.subject}</span>}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{note.title}</h3>
            {note.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{note.description}</p>}
            <p className="text-xs text-gray-400 mb-4 mt-auto">by {note.profiles?.full_name || 'Unknown'}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLike(note.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${myInteractions[`${note.id}_like`] ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-400 hover:bg-red-50'}`}
              >
                <Heart className={`w-3.5 h-3.5 ${myInteractions[`${note.id}_like`] ? 'fill-current' : ''}`} />
                Like
              </button>
              <button
                onClick={() => handleDownload(note)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notes found</p>
          </div>
        )}
      </motion.div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowUpload(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl z-50 p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">Upload Note</h2>
                <button onClick={() => setShowUpload(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <input type="text" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Note title *" className="input-field" required />
                <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Description (optional)" className="input-field resize-none" rows={3} />
                <select value={uploadForm.subject} onChange={e => setUploadForm({ ...uploadForm, subject: e.target.value })} className="input-field">
                  <option value="">Select subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                    onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] || null })}
                    className="text-sm text-gray-500"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPT, TXT</p>
                </div>
                <button type="submit" disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload Note'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
