import { apiGet, apiPost, apiDelete, apiPut } from '../lib/apiClient';

/**
 * Fetch notes with optional filters.
 */
export async function fetchNotes({ subject, search, sortBy, limit } = {}) {
  const params = new URLSearchParams();
  if (subject && subject !== 'All') params.set('subject', subject);
  if (search) params.set('search', search);
  if (sortBy) params.set('sortBy', sortBy);
  if (limit) params.set('limit', limit);

  const qs = params.toString();
  return apiGet(`/api/notes${qs ? '?' + qs : ''}`);
}

/**
 * Fetch distinct subjects from notes.
 */
export async function fetchSubjects() {
  return apiGet('/api/notes/subjects');
}

/**
 * Upload a new note (file + metadata).
 */
export async function uploadNote(userId, noteData, file) {
  const formData = new FormData();
  if (file) formData.append('note', file);
  formData.append('title', noteData.title);
  formData.append('subject', noteData.subject);
  if (noteData.description) formData.append('description', noteData.description);

  return apiPost('/api/notes', formData);
}

/**
 * Delete a note by ID.
 */
export async function deleteNote(noteId) {
  return apiDelete(`/api/notes/${noteId}`);
}

/**
 * Flag or unflag a note.
 */
export async function flagNote(noteId, flagged) {
  return apiPut(`/api/notes/${noteId}/flag`, { flagged });
}

/**
 * Approve or unapprove a note.
 */
export async function approveNote(noteId, approved) {
  return apiPut(`/api/notes/${noteId}/approve`, { approved });
}

/**
 * Rate a note (1-5).
 */
export async function rateNote(noteId, rating, review) {
  return apiPost(`/api/notes/${noteId}/rate`, { rating, review });
}

/**
 * Fetch reviews for a note.
 */
export async function fetchNoteReviews(noteId) {
  return apiGet(`/api/notes/${noteId}/reviews`);
}

/**
 * Download a note and trigger browser download.
 */
export async function downloadNote(noteId, fileName) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3001/api/notes/${noteId}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error('Download failed');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
