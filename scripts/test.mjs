import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const php = process.env.TASKFLOW_PHP || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php')
const env = { ...process.env, GEMINI_API_KEY: 'taskflow-test-key', GEMINI_MODEL: 'gemini-3.5-flash-lite', TASKFLOW_GEMINI_TEST_URL: 'http://127.0.0.1:8002', TASKFLOW_DB_NAME: `taskflow_test_${randomBytes(6).toString('hex')}` }
execFileSync(php, ['tests/migration.php'], { env, stdio: 'inherit' })
execFileSync(php, ['database/test-database.php', 'create'], { env, stdio: 'inherit' })
try {
  const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { env, stdio: 'inherit' })
  process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code) => resolve(code ?? 1)) })
} finally {
  execFileSync(php, ['database/test-database.php', 'drop'], { env, stdio: 'inherit' })
}
