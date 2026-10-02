/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// GitHub Pages serves from /diffcheck/; override with VITE_BASE env var or a custom domain.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/diffcheck/',
  plugins: [react(), tailwindcss()],
  // Unit tests only; Playwright owns e2e/.
  test: { include: ['src/**/*.test.ts'] },
})
