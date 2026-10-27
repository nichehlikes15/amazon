// Small helper for calling the Launchpad backend API.
// credentials: 'include' sends the session cookie so the server
// knows who is logged in.

// Set VITE_API_URL in .env for a live site; falls back to the local backend.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }
  return data
}

// Separate helper for multipart file uploads: we must NOT set a JSON
// content-type, so the browser adds the correct multipart boundary itself.
async function uploadRequest(path, formData) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Upload failed. Please try again.')
  }
  return data
}

export const api = {
  signup: (fullName, email, password) =>
    request('/signup', { method: 'POST', body: JSON.stringify({ fullName, email, password }) }),
  login: (email, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),
  submitInterest: (payload) =>
    request('/interest', { method: 'POST', body: JSON.stringify(payload) }),
  listInterest: () => request('/interest'),
  requestCoffeeChat: (payload) =>
    request('/coffee-chats', { method: 'POST', body: JSON.stringify(payload) }),
  myCoffeeChats: () => request('/me/coffee-chats'),
  exportMe: () => request('/me/export'),
  interviewQuestions: (pathway) => request(`/interview/questions?pathway=${encodeURIComponent(pathway || '')}`),
  reviewAnswer: (payload) =>
    request('/interview/review-answer', { method: 'POST', body: JSON.stringify(payload) }),
  reviewInterview: (answers) =>
    request('/interview/review', { method: 'POST', body: JSON.stringify({ answers }) }),
  listCoffeeChats: () => request('/coffee-chats'),
  updateCoffeeChatStatus: (id, status) =>
    request(`/coffee-chats/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateCoffeeChatDetails: (id, payload) =>
    request(`/coffee-chats/${id}/details`, { method: 'PUT', body: JSON.stringify(payload) }),
  cancelMyCoffeeChat: (id) => request(`/me/coffee-chats/${id}/cancel`, { method: 'POST' }),
  listOpportunities: () => request('/opportunities'),
  listSavedOpportunities: () => request('/saved-opportunities'),
  saveOpportunity: (id) =>
    request(`/opportunities/${id}/save`, { method: 'POST' }),
  unsaveOpportunity: (id) =>
    request(`/opportunities/${id}/save`, { method: 'DELETE' }),
  createOpportunity: (payload) =>
    request('/opportunities', { method: 'POST', body: JSON.stringify(payload) }),
  deleteOpportunity: (id) =>
    request(`/opportunities/${id}`, { method: 'DELETE' }),
  getOpportunity: (id) => request(`/opportunities/${id}`),
  updateProgress: (id, payload) =>
    request(`/opportunities/${id}/progress`, { method: 'PUT', body: JSON.stringify(payload) }),
  uploadFile: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return uploadRequest(`/opportunities/${id}/files`, fd)
  },
  deleteFile: (fileId) => request(`/files/${fileId}`, { method: 'DELETE' }),
  // Direct download URL (opened in a new tab, uses the session cookie).
  fileUrl: (fileId) => `${BASE}/files/${fileId}`,
  explainPathway: (scores) =>
    request('/pathway-explainer', { method: 'POST', body: JSON.stringify({ scores }) }),
  updateMe: (payload) =>
    request('/me', { method: 'PUT', body: JSON.stringify(payload) }),
  changePassword: (currentPassword, newPassword) =>
    request('/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteMe: () => request('/me', { method: 'DELETE' }),
  myProgress: () => request('/me/progress'),
  getCv: () => request('/me/cv'),
  uploadCv: (file) => {
    const form = new FormData()
    form.append('file', file)
    return uploadRequest('/me/cv', form)
  },
  deleteCv: () => request('/me/cv', { method: 'DELETE' }),
  cvFileUrl: () => `${BASE}/me/cv/file`,
  saveQuizResult: (pathway) =>
    request('/me/quiz-result', { method: 'POST', body: JSON.stringify({ pathway }) }),
}
