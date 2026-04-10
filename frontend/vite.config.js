/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Bridge REACT_APP_* env vars (used by Persona 1 & 3 services written for CRA)
// into Vite via process.env, so their services work as-is.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_')
  const processEnv = Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)])
  )
  return {
    plugins: [react()],
    define: {
      'process.env': processEnv,
    },
  }
})
