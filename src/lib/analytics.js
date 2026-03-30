import { supabase } from './supabase';

/**
 * Log an analytics event without blocking the UI.
 * Fails silently — never breaks the caller.
 */
export async function logEvent(eventType, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata,
    });
  } catch (err) {
    console.warn('[analytics] Failed to log event:', eventType, err.message);
  }
}
