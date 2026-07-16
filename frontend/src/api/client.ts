import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Papers ──────────────────────────────────────────────────────────────────
export const uploadPaper  = (form: FormData)      => api.post('/papers/upload', form).then(r => r.data)
export const listPapers   = ()                    => api.get('/papers/').then(r => r.data)
export const getPaper     = (id: string)          => api.get(`/papers/${id}`).then(r => r.data)

// ── Graph ────────────────────────────────────────────────────────────────────
export const getGraph     = (year?: number)       => api.get('/graph/', { params: year ? { year } : {} }).then(r => r.data)
export const runPagerank  = ()                    => api.post('/graph/pagerank').then(r => r.data)
export const explainNode  = (type: string, name: string, id?: string) =>
  api.get('/graph/node-explain', { params: { node_type: type, node_name: name, node_id: id } }).then(r => r.data)
export const getYearRange = ()                    => api.get('/graph/years').then(r => r.data)

// ── Authors ───────────────────────────────────────────────────────────────────
export const listAuthors        = ()                         => api.get('/authors/').then(r => r.data)
export const authorFingerprint  = (name: string)             => api.get(`/authors/${encodeURIComponent(name)}/fingerprint`).then(r => r.data)
export const compareAuthors     = (a1: string, a2: string)   => api.post('/authors/compare', { author1: a1, author2: a2 }).then(r => r.data)

// ── Analysis ──────────────────────────────────────────────────────────────────
export const getClaims        = (id: string) => api.get(`/analysis/claims/${id}`).then(r => r.data)
export const getNegResults    = (id: string) => api.get(`/analysis/negative-results/${id}`).then(r => r.data)
export const getAllNegResults  = ()          => api.get('/analysis/all-negative-results').then(r => r.data)
export const getCitationCtx   = (id: string) => api.get(`/analysis/citations/${id}`).then(r => r.data)
export const verifyClaimAdhoc = (claim: string, context: string) =>
  api.post('/analysis/verify-claim', { claim, context }).then(r => r.data)

// ── Hypothesis ────────────────────────────────────────────────────────────────
export const generateHypothesis = () => api.post('/hypothesis/generate').then(r => r.data)

// ── Reading Path ──────────────────────────────────────────────────────────────
export const generateReadingPath = (goal: string, max_papers = 10) =>
  api.post('/reading-path/generate', { goal, max_papers }).then(r => r.data)

// ── Timeline ──────────────────────────────────────────────────────────────────
export const getYearlyStats = () => api.get('/timeline/stats').then(r => r.data)