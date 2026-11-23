import api from './client';

/** Thin wrappers over the friends / leaderboard API. People are addressed by tag (without '#'). */
export const friendsApi = {
  leaderboard: (offset = 0) => api.get('/leaderboard/weekly', { params: { offset } }).then((r) => r.data),
  friends: () => api.get('/friends').then((r) => r.data.friends),
  requests: () => api.get('/friends/requests').then((r) => r.data),
  summary: () => api.get('/friends/summary').then((r) => r.data),
  send: (tag) => api.post('/friends/requests', { tag }).then((r) => r.data),
  accept: (tag) => api.post(`/friends/requests/${encodeURIComponent(tag)}/accept`).then((r) => r.data),
  removeRequest: (tag) => api.delete(`/friends/requests/${encodeURIComponent(tag)}`).then((r) => r.data),
  unfriend: (tag) => api.delete(`/friends/${encodeURIComponent(tag)}`).then((r) => r.data),
  profile: (tag) => api.get(`/friends/${encodeURIComponent(tag)}/profile`).then((r) => r.data.profile),
  search: (q) => api.get('/users/search', { params: { q } }).then((r) => r.data),
  /** Works signed out too (the invite page); the client sends the token when there is one. */
  byTag: (tag) => api.get(`/users/by-tag/${encodeURIComponent(tag)}`).then((r) => r.data)
};
