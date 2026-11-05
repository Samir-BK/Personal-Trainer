import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Requests beginning with /api are forwarded to Spring Boot.
      // React can use relative URLs instead of hardcoding localhost:8080.
      "/api": {
        target: 'https://personal-trainer-backend-6mai.onrender.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
