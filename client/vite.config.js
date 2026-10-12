import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// The dev server proxies /api to the HTTPS backend (self-signed cert, so
// secure:false in development only). The browser only talks to
// http://localhost:5173, which keeps CORS satisfied and avoids certificate prompts.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://localhost:5443',
        secure: false,
        changeOrigin: true,
      },
    },
  },
})
