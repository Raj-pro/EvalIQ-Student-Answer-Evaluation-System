import axios from 'axios'

// In development, Vite proxies /q-api → localhost:8001 etc.
// In production (Docker), the browser calls localhost:8001 directly because
// the backend ports are exposed. We detect by checking if we're on port 3001 (dev) or 80 (prod nginx).
const isDev = import.meta.env.DEV

export const questionAPI = axios.create({
  baseURL: isDev ? '/q-api' : 'http://localhost:8001',
  headers: { 'Content-Type': 'application/json' },
})

export const studentAPI = axios.create({
  baseURL: isDev ? '/s-api' : 'http://localhost:8002',
  headers: { 'Content-Type': 'application/json' },
})

export const mlAPI = axios.create({
  baseURL: isDev ? '/m-api' : 'http://localhost:8003',
  headers: { 'Content-Type': 'application/json' },
})
