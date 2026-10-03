import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Gunakan Edge yang sudah terpasang di Windows; selain itu gunakan Chromium Playwright.
const installedEdge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')

export default defineConfig({
  testDir: './tests',
  // Tes integrasi memakai papan database yang sama; hindari perubahan kolom bersamaan.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || (installedEdge ? 'msedge' : undefined),
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: process.platform === 'win32' ? 'C:\\xampp\\php\\php.exe -S 127.0.0.1:8000 -t .' : 'php -S 127.0.0.1:8000 -t .',
      url: 'http://127.0.0.1:8000/api/tasks.php',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
