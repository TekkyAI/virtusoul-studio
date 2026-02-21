import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __STUDIO_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5181',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
