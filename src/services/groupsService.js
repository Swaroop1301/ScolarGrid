import { apiGet, apiPost, apiDelete } from '../lib/apiClient';

/**
 * Fetch groups the user is a member of (or all for admin).
 */
export async function fetchUserGroups(userId) {
  return apiGet('/api/groups');
}

/**
 * Fetch all groups (admin).
 */
export async function fetchAllGroups() {
  return apiGet('/api/groups');
}

/**
 * Create a new group (admin).
 */
export async function createGroup(name, description, createdBy) {
  return apiPost('/api/groups', { name, description });
}

/**
 * Delete a group.
 */
export async function deleteGroup(groupId) {
  return apiDelete(`/api/groups/${groupId}`);
}

/**
 * Join a group by join code.
 */
export async function joinGroup(userId, joinCode) {
  return apiPost('/api/groups/join', { joinCode });
}

/**
 * Get member count for a group.
 * (Included in the groups list response, but kept for compatibility)
 */
export async function fetchGroupMemberCount(groupId) {
  const groups = await apiGet('/api/groups');
  const group = groups.find(g => g.id === groupId);
  return group?.members || 0;
}

/**
 * Add user to a group (admin/faculty).
 */
export async function addUserToGroup(groupId, userId) {
  return apiPost(`/api/groups/${groupId}/members`, { userId });
}

/**
 * Remove user from a group (admin/faculty).
 */
export async function removeUserFromGroup(groupId, userId) {
  return apiDelete(`/api/groups/${groupId}/members/${userId}`);
}
