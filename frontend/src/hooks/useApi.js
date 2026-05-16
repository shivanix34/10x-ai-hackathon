const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080`
const AI_URL = import.meta.env.VITE_AI_URL || `http://${window.location.hostname}:8081`

export async function fetchAPI(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  getSellers: (params = '') => fetchAPI(`/api/sellers?${params}`),
  getSeller: (id) => fetchAPI(`/api/sellers/${id}`),
  getSellerLeads: (id) => fetchAPI(`/api/sellers/${id}/leads`),
  getSellerQuota: (id) => fetchAPI(`/api/sellers/${id}/quota`),
  getSellerEvents: (id) => fetchAPI(`/api/sellers/${id}/events`),
  getSellerBehavior: (id) => fetchAPI(`/api/sellers/${id}/behavior`),
  getLeads: (params = '') => fetchAPI(`/api/leads?${params}`),
  getLead: (id) => fetchAPI(`/api/leads/${id}`),
  consumeLead: (leadId, sellerId) => fetchAPI(`/api/leads/${leadId}/consume`, {
    method: 'POST', body: JSON.stringify({ seller_id: sellerId }),
  }),
  getSalesDashboard: () => fetchAPI('/api/dashboard/sales'),
  getMonitoring: () => fetchAPI('/api/dashboard/monitoring'),
  getChurnAnalysis: () => fetchAPI('/api/dashboard/churn-analysis'),
  getInterventions: () => fetchAPI('/api/interventions'),
  resolveIntervention: (id) => fetchAPI(`/api/interventions/${id}/resolve`, { method: 'POST' }),
  unbookmarkIntervention: (id) => fetchAPI(`/api/interventions/${id}/unbookmark`, { method: 'POST' }),
  bookmarkSeller: (id, reason) => fetchAPI(`/api/sellers/${id}/bookmark`, {
    method: 'POST', body: JSON.stringify({ reason }),
  }),
  simulateEvent: (data) => fetchAPI('/api/simulate/event', {
    method: 'POST', body: JSON.stringify(data),
  }),
  // AI Service calls
  getSalesInsights: () => fetch(`${AI_URL}/score/sales-insights`).then(r => r.json()),
  generateRecommendation: (sellerId) => fetch(
    `${AI_URL}/score/recommendation?seller_id=${sellerId}`, { method: 'POST' }
  ).then(r => r.json()),
  getSellerAnalysis: (sellerId) => fetch(
    `${AI_URL}/score/seller-analysis?seller_id=${sellerId}`, { method: 'POST' }
  ).then(r => r.json()),
}
