import { apiGet, apiPost, apiDelete } from '../lib/apiClient';

/**
 * Fetch messages for a group, ordered by time.
 */
export async function fetchMessages(groupId, limit = 100) {
  return apiGet(`/api/messages/${groupId}?limit=${limit}`);
}

/**
 * Send a text message.
 */
export async function sendMessage(groupId, senderId, content) {
  return apiPost(`/api/messages/${groupId}`, { content });
}

/**
 * Delete a message (admin/faculty).
 */
export async function deleteMessage(messageId) {
  return apiDelete(`/api/messages/delete/${messageId}`);
}

/**
 * Send a file message — upload file via multer endpoint.
 */
export async function sendFileMessage(groupId, senderId, file) {
  const formData = new FormData();
  formData.append('chatFile', file);

  return apiPost(`/api/messages/${groupId}/file`, formData);
}

/**
 * Subscribe to new messages in a group (WebSocket).
 * Returns an object with a close() method for cleanup.
 */
export function subscribeToMessages(groupId, onNewMessage) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//localhost:3001`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join_room', groupId }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        onNewMessage(data.payload);
      }
    } catch (e) {
      console.error('WS message parse error:', e);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  // Return an object compatible with the old supabase channel pattern
  // The old code called supabase.removeChannel(channel)
  return {
    close: () => ws.close(),
    unsubscribe: () => ws.close(),
  };
}
