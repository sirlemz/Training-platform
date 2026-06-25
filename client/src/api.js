const BASE = '/api';

function getToken() {
  return localStorage.getItem('tgs_token');
}

async function req(method, path, body, isFormData = false) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('tgs_token');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),
  changePassword: (current, next) => req('PUT', '/auth/me/password', { current, next }),

  // Admin — stats
  stats: () => req('GET', '/admin/stats'),

  // Admin — trainees
  getTrainees: () => req('GET', '/admin/trainees'),
  createTrainee: (data) => req('POST', '/admin/trainees', data),
  updateTrainee: (id, data) => req('PUT', `/admin/trainees/${id}`, data),
  deleteTrainee: (id) => req('DELETE', `/admin/trainees/${id}`),

  // Admin — classes
  getClasses: () => req('GET', '/admin/classes'),
  createClass: (data) => req('POST', '/admin/classes', data),
  getClass: (id) => req('GET', `/admin/classes/${id}`),
  updateClass: (id, data) => req('PUT', `/admin/classes/${id}`, data),
  deleteClass: (id) => req('DELETE', `/admin/classes/${id}`),

  // Admin — class trainees
  assignTrainee: (classId, userId) => req('POST', `/admin/classes/${classId}/trainees`, { userId }),
  removeTrainee: (classId, userId) => req('DELETE', `/admin/classes/${classId}/trainees/${userId}`),

  // Admin — modules
  createModule: (classId, formData) => req('POST', `/admin/classes/${classId}/modules`, formData, true),
  updateModule: (id, formData) => req('PUT', `/admin/modules/${id}`, formData, true),
  deleteModule: (id) => req('DELETE', `/admin/modules/${id}`),
  reorderModules: (order) => req('PUT', '/admin/modules/reorder', { order }),

  // Admin — progress
  getClassProgress: (classId) => req('GET', `/admin/classes/${classId}/progress`),

  // Admin — assessments library
  getAssessments: () => req('GET', '/admin/assessments'),
  uploadAssessment: (formData) => req('POST', '/admin/assessments', formData, true),
  deleteAssessment: (filename) => req('DELETE', `/admin/assessments/${encodeURIComponent(filename)}`),

  // Trainee
  myClasses: () => req('GET', '/trainee/classes'),
  myClass: (id) => req('GET', `/trainee/classes/${id}`),
  saveProgress: (moduleId, data) => req('POST', `/trainee/progress/${moduleId}`, data),
  getCertificate: (classId) => req('GET', `/trainee/classes/${classId}/certificate`),
};
