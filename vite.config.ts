/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Served from the domain root, so base stays '/'.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  // Unit tests only; Playwright owns e2e/.
  test: { include: ['src/**/*.test.ts'] },
})
