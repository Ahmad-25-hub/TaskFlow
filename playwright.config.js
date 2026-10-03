import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Gunakan Edge yang sudah terpasang di Windows; selain itu gunakan Chromium Playwright.
const installedEdge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
if (!process.env.TASKFLOW_DB_NAME?.startsWith('taskflow_test_')) throw new Error('Gunakan npm test untuk menjalankan test dengan database terisolasi.')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || (installedEdge ? 'msedge' : undefined),
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: `${process.env.TASKFLOW_PHP || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php')} -S 127.0.0.1:8002 -t tests/fixtures tests/fixtures/gemini.php`,
      url: 'http://127.0.0.1:8002',
      stderr: 'ignore',
      reuseExistingServer: false,
    },
    {
      command: `${process.env.TASKFLOW_PHP || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php')} -S 127.0.0.1:8001 -t . api/router.php`,
      url: 'http://127.0.0.1:8001/api/auth.php',
      stderr: 'ignore',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { TASKFLOW_API_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
    },
  ],
})
