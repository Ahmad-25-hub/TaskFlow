import { workspaceStatistics } from '../src/utils/statistics.js'
import { test, expect } from '@playwright/test'
import { deadlineInfo } from '../src/utils/deadline.js'

const password = 'demo1234'
const tasksPath = (workspaceId, id = '') => `/api/tasks.php?workspace_id=${workspaceId}${id ? `&id=${id}` : ''}`
const region = (page, status) => page.getByRole('region', { name: status, exact: true })

async function register(api, email, name = 'Anggota Tim') {
  const response = await api.post('/api/auth.php?action=register', { data: { name, email, password } })
  expect(response.status()).toBe(201)
  return (await response.json()).user
}
async function createWorkspace(api, name = 'Project Bersama') {
  const response = await api.post('/api/workspaces.php', { data: { name, description: 'Workspace pengujian kolaborasi.' } })
  expect(response.status()).toBe(201)
  return (await response.json()).workspace
}
async function otherAccount(playwright, baseURL, email, name) {
  const api = await playwright.request.newContext({ baseURL })
  const user = await register(api, email, name)
  return { api, user }
}
async function addTask(page, title) {
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByLabel('Judul task').fill(title)
  await page.getByLabel('Deskripsi (opsional)').fill('Task kolaborasi yang tersimpan di database.')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('register pertama mendapatkan task lama; session bertahan, logout dan login berfungsi', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali.' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Daftar sekarang' }).click()
  await page.getByLabel('Nama lengkap').fill('Pemilik Pertama')
  await page.getByLabel('Email', { exact: true }).fill('owner-first@example.com')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Konfirmasi password').fill(password)
  await page.getByRole('button', { name: 'Buat akun', exact: true }).click()
  const workspace = page.getByRole('article', { name: 'TaskFlow Hackathon', exact: true })
  await expect(workspace).toContainText('Owner')
  await page.screenshot({ path: 'test-results/workspaces-desktop.png', fullPage: true })
  await workspace.getByRole('button', { name: 'Buka workspace' }).click()
  await expect(page.getByRole('article')).toHaveCount(7)
  await page.screenshot({ path: 'test-results/board-desktop.png', fullPage: true })
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(7)
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali.' })).toBeVisible()
  expect((await page.request.get(tasksPath('00000000-0000-4000-8000-000000000000'))).status()).toBe(401)
  await page.getByLabel('Email', { exact: true }).fill('owner-first@example.com')
  await page.getByLabel('Password', { exact: true }).fill('salah123')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Email atau password salah.')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(workspace).toBeVisible()
})

test('buat workspace, tambah/pindah/drag/hapus task, dan task terpisah antar workspace', async ({ page }) => {
  await register(page.request, 'creator@example.com', 'Pembuat Workspace')
  await page.goto('/')
  await page.getByRole('button', { name: 'Buat workspace', exact: true }).click()
  await page.getByLabel('Nama workspace').fill('Produk Tim')
  await page.getByLabel('Deskripsi (opsional)').fill('Project pertama tim.')
  await page.getByRole('dialog').getByRole('button', { name: 'Buat workspace', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Produk Tim.' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  await addTask(page, 'Task Project A')
  const task = page.getByRole('article', { name: 'Task Project A', exact: true })
  await page.reload()
  await expect(task).toBeVisible()
  await page.getByLabel('Status task Task Project A').selectOption('in_progress')
  await expect(region(page, 'In Progress').getByRole('article', { name: 'Task Project A' })).toBeVisible()
  await task.dragTo(region(page, 'Done'))
  await expect(region(page, 'Done').getByRole('article', { name: 'Task Project A' })).toBeVisible()
  await page.reload()
  await expect(region(page, 'Done').getByRole('article', { name: 'Task Project A' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Cari task' }).fill('kolaborasi')
  await expect(task).toBeVisible()
  await page.getByRole('button', { name: 'Bersihkan pencarian' }).click()
  await page.getByLabel('Filter status').selectOption('todo')
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.getByLabel('Filter status').selectOption('all')
  await page.getByRole('button', { name: 'Semua workspace' }).click()
  await expect(page.getByRole('article', { name: 'Produk Tim' })).toContainText('1 task')
  const second = await createWorkspace(page.request, 'Project B')
  await page.goto(`/#workspace=${second.id}`)
  await expect(page.getByRole('heading', { name: 'Project B.' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  const workspaces = (await (await page.request.get('/api/workspaces.php')).json()).workspaces
  const first = workspaces.find((item) => item.name === 'Produk Tim')
  await page.goto(`/#workspace=${first.id}`)
  await expect(task).toBeVisible()
  await page.getByRole('button', { name: 'Hapus task Task Project A' }).click()
  await expect(task).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('gabung dengan kode, kode salah ditolak, dan member dapat menambah task bersama', async ({ page, playwright, baseURL }) => {
  const { api: owner } = await otherAccount(playwright, baseURL, 'join-owner@example.com', 'Owner Kolaborasi')
  try {
    const workspace = await createWorkspace(owner, 'Tim Kolaborasi')
    const member = await register(page.request, 'joining-member@example.com', 'Member Kolaborasi')
    await page.goto('/')
    await page.getByRole('button', { name: 'Gabung workspace', exact: true }).click()
    await page.getByLabel('Kode undangan').fill('INVALID0')
    await page.getByRole('dialog').getByRole('button', { name: 'Gabung workspace', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Kode undangan tidak ditemukan.')
    await page.getByLabel('Kode undangan').fill(workspace.invite_code.toLowerCase())
    await page.getByRole('dialog').getByRole('button', { name: 'Gabung workspace', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Tim Kolaborasi.' })).toBeVisible()
    await addTask(page, 'Task dari member')
    const task = (await (await owner.get(tasksPath(workspace.id))).json()).tasks[0]
    expect(task.title).toBe('Task dari member')
    expect(task.created_by).toBe(member.id)
    expect((await page.request.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })).status()).toBe(200)
    expect((await (await owner.get(`/api/workspaces.php?id=${workspace.id}&action=members`)).json()).members).toHaveLength(2)
    await page.getByRole('button', { name: 'Anggota & pengaturan' }).click()
    await expect(page.getByRole('dialog')).toContainText('Member Kolaborasi')
    await page.screenshot({ path: 'test-results/members-desktop.png', fullPage: true })
    await expect(page.getByRole('dialog')).toContainText('Owner Kolaborasi')
    await expect(page.getByRole('button', { name: 'Simpan perubahan' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Buat kode baru' })).toHaveCount(0)
  } finally { await owner.dispose() }
})

test('owner dapat mengubah workspace, mengganti kode, dan mengeluarkan anggota', async ({ page, playwright, baseURL }) => {
  const user = await register(page.request, 'settings-owner@example.com', 'Owner Pengaturan')
  const workspace = await createWorkspace(page.request, 'Workspace Pengaturan')
  const { api: member, user: memberUser } = await otherAccount(playwright, baseURL, 'settings-member@example.com', 'Member Pengaturan')
  const { api: outsider } = await otherAccount(playwright, baseURL, 'settings-outsider@example.com', 'Teman Baru')
  try {
    await member.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    expect((await member.patch(`/api/workspaces.php?id=${workspace.id}`, { data: { name: 'Tidak boleh', description: '' } })).status()).toBe(403)
    expect((await member.delete(`/api/workspaces.php?id=${workspace.id}&action=member&user_id=${user.id}`)).status()).toBe(403)
    await page.goto(`/#workspace=${workspace.id}`)
    await page.getByRole('button', { name: 'Anggota & pengaturan' }).click()
    await page.getByLabel('Nama workspace').fill('Nama Workspace Baru')
    await page.getByLabel('Deskripsi workspace').fill('Deskripsi yang diperbarui.')
    await page.getByRole('button', { name: 'Simpan perubahan' }).click()
    await expect(page.getByRole('dialog')).toContainText('Workspace berhasil diperbarui.')
    await page.getByRole('button', { name: 'Buat kode baru' }).click()
    await expect(page.getByTestId('invite-code')).not.toHaveText(workspace.invite_code)
    const code = await page.getByTestId('invite-code').innerText()
    expect((await outsider.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })).status()).toBe(404)
    expect((await outsider.post('/api/workspaces.php?action=join', { data: { invite_code: code } })).status()).toBe(200)
    await page.getByRole('button', { name: 'Keluarkan Member Pengaturan' }).click()
    await expect(page.getByRole('dialog')).toContainText('Anggota dikeluarkan')
    expect((await member.get(tasksPath(workspace.id))).status()).toBe(403)
    expect((await page.request.delete(`/api/workspaces.php?id=${workspace.id}&action=member&user_id=${user.id}`)).status()).toBe(422)
    const remaining = (await (await page.request.get(`/api/workspaces.php?id=${workspace.id}&action=members`)).json()).members
    expect(remaining.some((item) => item.id === memberUser.id)).toBe(false)
    await page.getByRole('button', { name: 'Tutup dialog' }).click()
    await expect(page.getByRole('heading', { name: 'Nama Workspace Baru.' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nama Workspace Baru.' })).toBeVisible()
  } finally { await member.dispose(); await outsider.dispose() }
})

test('API membatasi akses workspace dan menolak manipulasi ID task antar workspace', async ({ page, playwright, baseURL }) => {
  const { api: owner } = await otherAccount(playwright, baseURL, 'isolation-owner@example.com', 'Owner A')
  try {
    expect((await page.request.get('/api/workspaces.php')).status()).toBe(401)
    expect((await page.request.post('/api/tasks.php', { data: { title: 'Tanpa login' } })).status()).toBe(401)
    const first = await createWorkspace(owner, 'Workspace Rahasia A')
    const task = (await (await owner.post(tasksPath(first.id), { data: { title: 'Task privat', status: 'todo' } })).json()).task
    await register(page.request, 'isolation-outsider@example.com', 'Owner B')
    const second = await createWorkspace(page.request, 'Workspace B')
    expect((await page.request.get(tasksPath(first.id))).status()).toBe(403)
    expect((await page.request.post(tasksPath(first.id), { data: { title: 'Task ilegal' } })).status()).toBe(403)
    expect((await page.request.patch(tasksPath(second.id, task.id), { data: { status: 'done' } })).status()).toBe(404)
    expect((await page.request.delete(tasksPath(second.id, task.id))).status()).toBe(404)
    const unchanged = (await (await owner.get(tasksPath(first.id))).json()).tasks[0]
    expect(unchanged.status).toBe('todo')
    expect((await page.request.post('/api/auth.php?action=register', { data: { name: 'Duplikat', email: 'isolation-outsider@example.com', password } })).status()).toBe(409)
  } finally { await owner.dispose() }
})

test('layar kecil, validasi form, dan navigasi keyboard modal tetap berfungsi', async ({ page }) => {
  await page.goto('/')
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true })
  await register(page.request, 'mobile@example.com', 'User Mobile')
  await page.reload()
  await page.getByRole('button', { name: 'Buat workspace', exact: true }).click()
  await expect(page.getByLabel('Nama workspace')).toBeFocused()
  await page.getByRole('dialog').getByRole('button', { name: 'Buat workspace', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Tutup dialog' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const workspace = await createWorkspace(page.request, 'Workspace Mobile')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByLabel('Judul task').fill('   ')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByText('Judul task perlu diisi.')).toBeVisible()
  await page.getByLabel('Judul task').fill('Task Mobile')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await page.getByLabel('Status task Task Mobile').selectOption('done')
  await expect(region(page, 'Done').getByRole('article', { name: 'Task Mobile' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('penyimpanan gagal mempertahankan form; session berakhir kembali ke login', async ({ page }) => {
  await register(page.request, 'failure@example.com', 'Uji Kegagalan')
  const workspace = await createWorkspace(page.request, 'Workspace Kegagalan')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.route('**/api/tasks.php*', (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, json: { error: 'Penyimpanan sedang gagal.' } }) : route.continue())
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByLabel('Judul task').fill('Task belum tersimpan')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Penyimpanan sedang gagal.')
  await expect(page.getByLabel('Judul task')).toHaveValue('Task belum tersimpan')
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.unroute('**/api/tasks.php*')
  await page.request.post('/api/auth.php?action=logout')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali.' })).toBeVisible()
})


test('kolom custom: warna, persistensi, pindah task, dan hapus hanya pada workspace aktif', async ({ page }) => {
  await register(page.request, 'columns@example.com')
  const a = await createWorkspace(page.request, 'Kolom Tim A')
  const b = await createWorkspace(page.request, 'Kolom Tim B')
  const path = (workspace, id = '') => `/api/columns.php?workspace_id=${workspace.id}${id ? `&id=${id}` : ''}`
  await page.goto(`/#workspace=${a.id}`)
  await page.getByRole('button', { name: 'Tambah kolom baru' }).click()
  await page.getByLabel('Nama kolom').fill('In Review')
  await page.getByLabel('Deskripsi (opsional)').fill('Peninjauan bersama tim')
  await page.getByRole('button', { name: 'Rose', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rose', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Buat kolom', exact: true }).click()
  const review = region(page, 'In Review')
  await expect(review).toHaveClass(/column-rose/)
  await expect(review).toContainText('Peninjauan bersama tim')
  await page.getByRole('button', { name: 'Tambah task ke In Review' }).click()
  await page.getByLabel('Judul task').fill('Review Produk')
  await expect(page.getByLabel('Status awal')).toHaveValue('in_review')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(review.getByRole('article', { name: 'Review Produk' })).toBeVisible()
  await page.getByLabel('Status task Review Produk').selectOption('todo')
  await expect(region(page, 'To Do').getByRole('article', { name: 'Review Produk' })).toBeVisible()
  await page.getByRole('article', { name: 'Review Produk' }).dragTo(review)
  await expect(review.getByRole('article', { name: 'Review Produk' })).toBeVisible()
  await page.reload()
  await expect(review.getByRole('article', { name: 'Review Produk' })).toBeVisible()
  await page.getByLabel('Filter status').selectOption('in_review')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/custom-columns-desktop.png', fullPage: true })
  const otherColumn = await page.request.post(path(b), { data: { label: 'In Review', description: '', color: 'teal' } })
  expect(otherColumn.status()).toBe(201)
  expect((await otherColumn.json()).column.id).toBe('in_review')
  await page.request.post(tasksPath(b.id), { data: { title: 'Review B', description: '', status: 'in_review' } })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Hapus kolom In Review' }).click()
  await expect(review).toHaveCount(0)
  await expect(region(page, 'To Do').getByRole('article', { name: 'Review Produk' })).toBeVisible()
  expect((await (await page.request.get(tasksPath(b.id))).json()).tasks[0].status).toBe('in_review')
  expect((await (await page.request.get(path(b))).json()).columns.find((column) => column.id === 'in_review').color).toBe('teal')
  await page.reload()
  await expect(review).toHaveCount(0)
  await expect(region(page, 'To Do').getByRole('article', { name: 'Review Produk' })).toBeVisible()
})

test('API kolom memeriksa anggota, validasi status, kolom utama, dan kegagalan simpan', async ({ page, playwright, baseURL }) => {
  await register(page.request, 'columns-owner@example.com')
  const workspace = await createWorkspace(page.request, 'Tim Validasi Kolom')
  const path = `/api/columns.php?workspace_id=${workspace.id}`
  const outsider = await playwright.request.newContext({ baseURL })
  try {
    expect((await outsider.get(path)).status()).toBe(401)
    await register(outsider, 'columns-outsider@example.com')
    expect((await outsider.get(path)).status()).toBe(403)
    expect((await outsider.post(path, { data: { label: 'Rahasia', color: 'sky' } })).status()).toBe(403)
    await outsider.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    expect((await outsider.post(path, { data: { label: 'QA', description: '', color: 'sky' } })).status()).toBe(201)
    expect((await outsider.post(path, { data: { label: 'QA', description: '', color: 'sky' } })).status()).toBe(201)
    const columns = (await (await outsider.get(path)).json()).columns
    expect(new Set(columns.map((column) => column.id)).size).toBe(5)
    expect((await outsider.delete(`${path}&id=todo`)).status()).toBe(422)
    expect((await outsider.post(path, { data: { label: 'Invalid', description: '', color: 'invalid' } })).status()).toBe(422)
    expect((await outsider.post(tasksPath(workspace.id), { data: { title: 'Invalid', description: '', status: 'missing' } })).status()).toBe(422)
    const own = await createWorkspace(outsider, 'Workspace Terpisah')
    expect((await outsider.post(tasksPath(own.id), { data: { title: 'Invalid', description: '', status: 'qa' } })).status()).toBe(422)
    expect((await outsider.delete(`${path}&id=missing`)).status()).toBe(404)
  } finally { await outsider.dispose() }
  await page.goto(`/#workspace=${workspace.id}`)
  await page.route('**/api/columns.php*', (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, json: { error: 'Kolom gagal disimpan.' } }) : route.continue())
  await page.getByRole('button', { name: 'Tambah kolom baru' }).click()
  await page.getByLabel('Nama kolom').fill('Belum Disimpan')
  await page.getByRole('button', { name: 'Buat kolom', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Kolom gagal disimpan.')
  await expect(page.getByLabel('Nama kolom')).toHaveValue('Belum Disimpan')
  await expect(region(page, 'Belum Disimpan')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['taskflow-theme'])
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})


test('penanda tanggal WIB, batas segera, dan Done', () => {
  const now = new Date('2026-10-03T18:00:00Z')
  expect(deadlineInfo(null, 'todo', now)).toBeNull()
  for (const [date, label] of [['2026-10-03', 'Terlambat'], ['2026-10-04', 'Hari ini'], ['2026-10-05', 'Segera'], ['2026-10-06', 'Segera'], ['2026-10-07', 'Deadline']]) {
    expect(deadlineInfo(date, 'todo', now).label).toBe(label)
  }
  expect(deadlineInfo('2026-10-03', 'done', now).label).toBe('Selesai')
})

test('deadline tambah, ubah, hapus, persistensi dan Done', async ({ page }) => {
  await register(page.request, 'deadline@example.com')
  const workspace = await createWorkspace(page.request, 'Tim Deadline')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByLabel('Judul task').fill('Task Deadline')
  await page.getByLabel('Deadline (opsional)').fill('2020-01-01')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  const card = page.getByRole('article', { name: 'Task Deadline', exact: true })
  await expect(card).toContainText('Terlambat')
  await page.reload()
  await expect(card).toContainText('Terlambat')
  await card.getByLabel('Status task Task Deadline').selectOption('done')
  await expect(card).toContainText('Selesai')
  await expect(card).not.toContainText('Terlambat')
  await card.getByLabel('Status task Task Deadline').selectOption('todo')
  await expect(card).toContainText('Terlambat')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  await card.getByRole('button', { name: 'Ubah deadline Task Deadline' }).click()
  await card.getByLabel('Deadline Task Deadline', { exact: true }).fill(today)
  await card.getByRole('button', { name: 'Simpan deadline' }).click()
  await expect(card).toContainText('Hari ini')
  await page.reload()
  await expect(card).toContainText('Hari ini')
  await card.getByRole('button', { name: 'Ubah deadline Task Deadline' }).click()
  await card.getByRole('button', { name: 'Hapus deadline' }).click()
  await expect(card.getByRole('button', { name: 'Tambah deadline Task Deadline' })).toBeVisible()
  await page.reload()
  await expect(card.getByRole('button', { name: 'Tambah deadline Task Deadline' })).toBeVisible()
  const tasks = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks
  expect(tasks[0].deadline).toBeNull()
  expect(tasks[0].status).toBe('todo')
  await card.getByRole('button', { name: 'Tambah deadline Task Deadline' }).click()
  await card.getByLabel('Deadline Task Deadline', { exact: true }).fill('2030-01-01')
  await card.getByRole('button', { name: 'Simpan deadline' }).click()
  await expect(card).toContainText('1 Jan 2030')
  await page.screenshot({ path: 'test-results/deadline-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/deadline-mobile.png', fullPage: true })
})

test('validasi API deadline, isolasi workspace, dan kegagalan simpan', async ({ page }) => {
  await register(page.request, 'deadline-validation@example.com')
  const workspace = await createWorkspace(page.request, 'Validasi Deadline')
  for (const deadline of ['2026-02-30', '03-10-2026', '2026-10-03T12:00:00Z', 123, '0000-01-01']) {
    expect((await page.request.post(tasksPath(workspace.id), { data: { title: 'Invalid', description: '', deadline } })).status()).toBe(422)
  }
  const response = await page.request.post(tasksPath(workspace.id), { data: { title: 'Deadline API', description: '', deadline: '2028-02-29' } })
  expect(response.status()).toBe(201)
  const task = (await response.json()).task
  const other = await createWorkspace(page.request, 'Deadline Workspace Lain')
  expect((await page.request.patch(tasksPath(other.id, task.id), { data: { deadline: null } })).status()).toBe(404)
  expect((await page.request.patch(tasksPath(workspace.id, task.id), { data: { deadline: '2027-02-29' } })).status()).toBe(422)
  expect((await page.request.patch(tasksPath(workspace.id, task.id), { data: { deadline: '2031-01-01', status: 'done' } })).status()).toBe(200)
  const saved = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
  expect(saved.deadline).toBe('2031-01-01')
  expect(saved.status).toBe('done')
  await page.goto(`/#workspace=${workspace.id}`)
  const card = page.getByRole('article', { name: 'Deadline API', exact: true })
  await card.getByRole('button', { name: 'Ubah deadline Deadline API' }).click()
  await card.getByLabel('Deadline Deadline API', { exact: true }).fill('2032-01-01')
  await page.route('**/api/tasks.php*', (route) => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 500, json: { error: 'Deadline gagal disimpan.' } }) : route.continue())
  await card.getByRole('button', { name: 'Simpan deadline' }).click()
  await expect(page.getByRole('alert')).toContainText('Deadline gagal disimpan.')
  await expect(card.getByLabel('Deadline Deadline API', { exact: true })).toHaveValue('2032-01-01')
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0].deadline).toBe('2031-01-01')
  await card.getByRole('button', { name: 'Batal', exact: true }).click()
  await expect(card).toContainText('1 Jan 2031')
})

test('mode gelap dan terang berlaku di login dan papan serta tersimpan setelah reload', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('taskflow-theme', 'light'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.auth-form-area')).toHaveCSS('background-color', 'rgb(18, 20, 22)')
  await page.screenshot({ path: 'test-results/login-dark.png', fullPage: true })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await register(page.request, 'theme-owner@example.com', 'Pemilik Tema')
  const workspace = await createWorkspace(page.request, 'Papan Tema')
  await page.reload()
  await page.screenshot({ path: 'test-results/workspaces-dark.png', fullPage: true })
  await page.goto(`/#workspace=${workspace.id}`)
  await expect(page.locator('.kanban-column.column-indigo')).toHaveCSS('background-color', 'rgb(29, 39, 47)')
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByLabel('Judul task').fill('Rencana peluncuran')
  await page.getByLabel('Deskripsi (opsional)').fill('Siapkan daftar pekerjaan untuk tim.')
  await page.screenshot({ path: 'test-results/task-form-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Rencana peluncuran' })).toBeVisible()
  await page.screenshot({ path: 'test-results/board-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Statistik', exact: true }).click()
  await expect(page.getByLabel('Total task', { exact: true })).toHaveCSS('background-color', 'rgb(30, 33, 37)')
  await page.screenshot({ path: 'test-results/statistics-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Kembali ke board' }).click()
  await page.getByRole('button', { name: 'Edit task Rencana peluncuran' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toHaveCSS('background-color', 'rgb(30, 33, 37)')
  await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Batal', exact: true }).click()
  await page.getByRole('button', { name: 'Anggota & pengaturan' }).click()
  await page.screenshot({ path: 'test-results/settings-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Tutup dialog' }).click()
  await page.getByRole('button', { name: 'Tambah kolom baru' }).click()
  await page.screenshot({ path: 'test-results/column-form-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Tutup form' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Aktifkan mode terang' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.kanban-column.column-indigo')).toHaveCSS('background-color', 'rgb(232, 242, 251)')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('perpindahan task memberi animasi singkat dan menghormati reduced motion', async ({ page }) => {
  await register(page.request, 'motion@example.com')
  const workspace = await createWorkspace(page.request, 'Papan Animasi')
  await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Bergerak', description: '' } })
  await page.addInitScript(() => {
    window.taskflowAnimations = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      window.taskflowAnimations.push({ taskId: this.dataset.taskId, duration: options.duration })
      return animate.call(this, frames, options)
    }
  })
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByLabel('Status task Task Bergerak').selectOption('in_progress')
  await expect(region(page, 'In Progress').getByRole('article', { name: 'Task Bergerak' })).toBeVisible()
  expect(await page.evaluate(() => window.taskflowAnimations.some((item) => item.taskId && item.duration === 280))).toBe(true)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { window.taskflowAnimations = [] })
  await page.getByLabel('Status task Task Bergerak').selectOption('done')
  await expect(region(page, 'Done').getByRole('article', { name: 'Task Bergerak' })).toBeVisible()
  expect(await page.evaluate(() => window.taskflowAnimations.length)).toBe(0)
})

test('edit task mengisi data lama, menyimpan semua field, batal, dan reload', async ({ page }) => {
  await register(page.request, 'edit-task@example.com')
  const workspace = await createWorkspace(page.request, 'Tim Edit Task')
  const custom = (await (await page.request.post(`/api/columns.php?workspace_id=${workspace.id}`, { data: { label: 'Review Edit', color: 'purple' } })).json()).column
  const original = (await (await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Sebelum Edit', description: 'Deskripsi lama', status: 'todo', deadline: '2030-01-01' } })).json()).task
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Edit task Task Sebelum Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit task' })
  await expect(dialog.getByLabel('Judul task')).toHaveValue(original.title)
  await expect(dialog.getByLabel('Deskripsi (opsional)')).toHaveValue(original.description)
  await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue('todo')
  await expect(dialog.getByLabel('Deadline (opsional)')).toHaveValue('2030-01-01')
  await dialog.getByLabel('Judul task').fill('Perubahan dibatalkan')
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
  await expect(page.getByRole('article', { name: original.title })).toBeVisible()
  await page.getByRole('button', { name: `Edit task ${original.title}` }).click()
  await dialog.getByLabel('Judul task').fill('Task Setelah Edit')
  await dialog.getByLabel('Deskripsi (opsional)').fill('Deskripsi yang telah diperbarui')
  await dialog.getByLabel('Status', { exact: true }).selectOption(custom.id)
  await dialog.getByLabel('Deadline (opsional)').fill('2031-05-10')
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(dialog).toHaveCount(0)
  const card = region(page, custom.label).getByRole('article', { name: 'Task Setelah Edit' })
  await expect(card).toContainText('Deskripsi yang telah diperbarui')
  await expect(card).toContainText('10 Mei 2031')
  await page.reload()
  await expect(card).toBeVisible()
  const saved = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
  expect(saved).toMatchObject({ id: original.id, created_at: original.created_at, created_by: original.created_by, workspace_id: original.workspace_id, title: 'Task Setelah Edit', description: 'Deskripsi yang telah diperbarui', status: custom.id, deadline: '2031-05-10' })
  await card.getByRole('button', { name: 'Edit task Task Setelah Edit' }).click()
  await dialog.getByLabel('Deskripsi (opsional)').fill('')
  await dialog.getByLabel('Deadline (opsional)').fill('')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/edit-task-mobile.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
  const cleared = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
  expect(cleared.description).toBe('')
  expect(cleared.deadline).toBeNull()
})

test('API edit memvalidasi semua field secara atomik dan membatasi workspace', async ({ page, playwright, baseURL }) => {
  await register(page.request, 'edit-validation@example.com')
  const workspace = await createWorkspace(page.request, 'Validasi Edit')
  const task = (await (await page.request.post(tasksPath(workspace.id), { data: { title: 'Tetap Utuh', description: 'Detail awal', deadline: '2030-01-01' } })).json()).task
  const endpoint = tasksPath(workspace.id, task.id)
  for (const data of [{ title: '   ' }, { title: 'x'.repeat(121) }, { title: 123 }, { description: 'x'.repeat(1001) }, { description: null }, { title: 'Tidak boleh tersimpan', status: 'missing' }, { title: 'Tidak boleh tersimpan', deadline: '2031-02-30' }]) {
    expect((await page.request.patch(endpoint, { data })).status()).toBe(422)
  }
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]).toEqual(task)
  const outsider = await playwright.request.newContext({ baseURL })
  try {
    expect((await outsider.patch(endpoint, { data: { title: 'Unauthorized' } })).status()).toBe(401)
    await register(outsider, 'edit-outsider@example.com')
    expect((await outsider.patch(endpoint, { data: { title: 'Unauthorized' } })).status()).toBe(403)
    await outsider.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    const edit = await outsider.patch(endpoint, { data: { title: '  Edit dari Member  ' } })
    expect(edit.status()).toBe(200)
    expect((await edit.json()).task).toMatchObject({ title: 'Edit dari Member', description: task.description, status: task.status, deadline: task.deadline, created_at: task.created_at, created_by: task.created_by })
  } finally { await outsider.dispose() }
  const other = await createWorkspace(page.request, 'Workspace Edit Lain')
  expect((await page.request.patch(tasksPath(other.id, task.id), { data: { title: 'Lintas Workspace' } })).status()).toBe(404)
})

test('form edit mempertahankan input saat gagal, validasi judul, dan kembali ke login jika session habis', async ({ page }) => {
  await register(page.request, 'edit-failure@example.com')
  const workspace = await createWorkspace(page.request, 'Edit Gagal')
  await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Edit Gagal', description: 'Detail semula' } })
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Edit task Task Edit Gagal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit task' })
  await dialog.getByLabel('Judul task').fill('  ')
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(dialog.getByText('Judul task perlu diisi.')).toBeVisible()
  await dialog.getByLabel('Judul task').fill('Belum Tersimpan')
  await page.route('**/api/tasks.php*', (route) => route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'Edit gagal disimpan.' } }) : route.continue())
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Edit gagal disimpan.')
  await expect(dialog.getByLabel('Judul task')).toHaveValue('Belum Tersimpan')
  await expect(page.getByRole('article', { name: 'Task Edit Gagal' })).toBeVisible()
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0].title).toBe('Task Edit Gagal')
  await page.unroute('**/api/tasks.php*')
  await page.request.post('/api/auth.php?action=logout')
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali.' })).toBeVisible()
})


test('pembuat dan penyelesai berbeda, edit mempertahankan catatan, buka ulang dan selesai lagi', async ({ page, playwright, baseURL }) => {
  const owner = await register(page.request, 'attribution-owner@example.com', 'Pembuat Tugas')
  const workspace = await createWorkspace(page.request, 'Tim Pelacakan Task')
  const task = (await (await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Bersama', description: '', created_by: 'spoof', completed_by: 'spoof' } })).json()).task
  expect(task).toMatchObject({ created_by: owner.id, creator_name: 'Pembuat Tugas', completed_by: null, completed_at: null, completer_name: null })
  const member = await otherAccount(playwright, baseURL, 'attribution-member@example.com', 'Penyelesai Tugas')
  try {
    await member.api.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    const endpoint = tasksPath(workspace.id, task.id)
    const finish = await member.api.patch(endpoint, { data: { status: 'done', completed_by: owner.id, completed_at: '2000-01-01' } })
    expect(finish.status()).toBe(200)
    const done = (await finish.json()).task
    expect(done).toMatchObject({ created_by: owner.id, completed_by: member.user.id, creator_name: 'Pembuat Tugas', completer_name: 'Penyelesai Tugas' })
    expect(Number.isNaN(Date.parse(done.completed_at))).toBe(false)
    await page.goto(`/#workspace=${workspace.id}`)
    const card = page.getByRole('article', { name: task.title })
    await expect(card).toContainText('Dibuat oleh: Pembuat Tugas')
    await expect(card).toContainText('Diselesaikan oleh: Penyelesai Tugas')
    await expect(card).toContainText('WIB')
    await page.reload()
    await expect(card).toContainText('Diselesaikan oleh: Penyelesai Tugas')
    const edited = (await (await page.request.patch(endpoint, { data: { title: task.title, status: 'done', deadline: '2030-01-01', completed_by: owner.id } })).json()).task
    expect(edited.completed_by).toBe(member.user.id)
    expect(edited.completed_at).toBe(done.completed_at)
    await page.getByLabel(`Status task ${task.title}`).selectOption('in_progress')
    await expect(card).not.toContainText('Diselesaikan oleh:')
    const reopened = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
    expect(reopened.completed_by).toBeNull()
    expect(reopened.completed_at).toBeNull()
    await card.dragTo(region(page, 'Done'))
    await expect(card).toContainText('Diselesaikan oleh: Pembuat Tugas')
    const completedAgain = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
    expect(completedAgain.completed_by).toBe(owner.id)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/task-attribution-mobile.png', fullPage: true })
    await page.request.delete(`/api/workspaces.php?id=${workspace.id}&action=member&user_id=${member.user.id}`)
    const otherTask = (await (await page.request.post(tasksPath(workspace.id), { data: { title: 'Langsung selesai', description: '', status: 'done' } })).json()).task
    expect(otherTask.completed_by).toBe(owner.id)
    expect(otherTask.completer_name).toBe('Pembuat Tugas')
  } finally { await member.api.dispose() }
})

test('nama tetap tersedia setelah anggota dikeluarkan dan catatan lama tidak direkayasa', async ({ page, playwright, baseURL }) => {
  await register(page.request, 'history-owner@example.com', 'Owner Riwayat')
  const workspace = await createWorkspace(page.request, 'Riwayat Anggota')
  const member = await otherAccount(playwright, baseURL, 'history-member@example.com', 'Anggota Lama')
  try {
    await member.api.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    const task = (await (await member.api.post(tasksPath(workspace.id), { data: { title: 'Task Anggota Lama', description: '', status: 'done' } })).json()).task
    await page.request.delete(`/api/workspaces.php?id=${workspace.id}&action=member&user_id=${member.user.id}`)
    const saved = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks[0]
    expect(saved).toMatchObject({ created_by: task.created_by, creator_name: 'Anggota Lama', completed_by: task.completed_by, completer_name: 'Anggota Lama', completed_at: task.completed_at })
    expect((await member.api.patch(tasksPath(workspace.id, task.id), { data: { status: 'todo' } })).status()).toBe(403)
  } finally { await member.api.dispose() }
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ json: { tasks: [{ id: 'old-task', title: 'Task selesai lama', description: '', status: 'done', created_at: '2026-10-03T00:00:00Z', creator_name: null, completed_by: null, completed_at: null, completer_name: null }] } }))
  await page.goto(`/#workspace=${workspace.id}`)
  const card = page.getByRole('article', { name: 'Task selesai lama' })
  await expect(card).toContainText('Dibuat oleh: Belum tercatat')
  await expect(card).toContainText('Diselesaikan oleh: Belum tercatat')
})


test('statistik menghitung status custom, tanggal WIB, anggota lama dan data belum tercatat', () => {
  const tasks = [
    { status: 'done', created_by: 'a', creator_name: 'A', completed_by: 'b', completer_name: 'B', completed_at: '2026-10-03T00:00:00Z', deadline: '2020-01-01' },
    { status: 'review', created_by: 'b', creator_name: 'B', deadline: '2026-10-04' },
    { status: 'todo', created_by: null, deadline: '2026-10-03' },
    { status: 'done', created_by: 'a', creator_name: 'A', completed_by: null, completed_at: null },
  ]
  const stats = workspaceStatistics(tasks, [{ id: 'done' }, { id: 'review' }, { id: 'todo' }], [{ id: 'a', name: 'A' }, { id: 'c', name: 'C' }], new Date('2026-10-03T18:00:00Z'))
  expect(stats).toMatchObject({ total: 4, done: 2, open: 2, progress: 50, overdue: 1, dueSoon: 1, unknownCompletion: 1, noDeadline: 1 })
  expect(stats.people.find((person) => person.id === 'a')).toMatchObject({ created: 2, completed: 0, active: true })
  expect(stats.people.find((person) => person.id === 'b')).toMatchObject({ created: 1, completed: 1, active: false })
  expect(stats.people.find((person) => person.id === 'c')).toMatchObject({ created: 0, completed: 0 })
  expect(stats.people.find((person) => person.id === 'unrecorded')).toMatchObject({ created: 1, completed: 1 })
  expect(stats.statuses.map((status) => status.count)).toEqual([2, 1, 1])
  expect(workspaceStatistics([], [], []).progress).toBe(0)
})

test('tombol statistik: hitungan anggota, detail selesai, reload, refresh, mobile, kembali board', async ({ page, playwright, baseURL }) => {
  const owner = await register(page.request, 'stats-owner@example.com', 'Owner Statistik')
  const workspace = await createWorkspace(page.request, 'Workspace Statistik A')
  const other = await createWorkspace(page.request, 'Workspace Statistik B')
  await page.request.post(tasksPath(other.id), { data: { title: 'Task workspace lain', description: '', status: 'done' } })
  await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Terlambat', description: '', deadline: '2020-01-01' } })
  await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Owner Selesai', description: '', status: 'done' } })
  const member = await otherAccount(playwright, baseURL, 'stats-member@example.com', 'Member Statistik')
  try {
    await member.api.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    await member.api.post(tasksPath(workspace.id), { data: { title: 'Task Member Selesai', description: '', status: 'done' } })
    await page.goto(`/#workspace=${workspace.id}`)
    await page.getByRole('button', { name: 'Statistik', exact: true }).click()
    await expect(page).toHaveURL(/view=statistics/)
    await expect(page.getByRole('heading', { name: 'Statistik workspace', exact: true })).toBeVisible()
    await expect(page.getByLabel('Total task', { exact: true })).toContainText('3')
    await expect(page.getByLabel('Selesai', { exact: true })).toContainText('2')
    await expect(page.getByLabel('Belum selesai', { exact: true })).toContainText('1')
    await expect(page.getByLabel('Terlambat', { exact: true })).toContainText('1')
    await expect(page.getByText('Progress 67%', { exact: false })).toBeVisible()
    const contribution = page.getByRole('region', { name: 'Kontribusi anggota' })
    await expect(contribution.getByRole('row', { name: 'Owner Statistik Anggota aktif 2 1' })).toBeVisible()
    await expect(contribution.getByRole('row', { name: 'Member Statistik Anggota aktif 1 1' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Detail task selesai' })).toContainText('Task Member Selesai')
    await expect(page.getByText('Task workspace lain')).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Total task', { exact: true })).toContainText('3')
    await page.request.post(tasksPath(workspace.id), { data: { title: 'Task Baru', description: '' } })
    await page.getByRole('button', { name: 'Perbarui statistik' }).click()
    await expect(page.getByLabel('Total task', { exact: true })).toContainText('4')
    await page.screenshot({ path: 'test-results/statistics-desktop.png', fullPage: true })
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/statistics-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Kembali ke board' }).click()
    await expect(page.getByRole('heading', { name: 'Workspace Statistik A.' })).toBeVisible()
    await page.getByRole('button', { name: 'Statistik', exact: true }).click()
    await expect(page.getByLabel('Total task', { exact: true })).toContainText('4')
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Workspace Statistik A.' })).toBeVisible()
    expect(owner.id).toBeTruthy()
  } finally { await member.api.dispose() }
})

test('statistik workspace kosong dan kegagalan API tidak menampilkan angka palsu', async ({ page }) => {
  await register(page.request, 'stats-empty@example.com')
  const workspace = await createWorkspace(page.request, 'Statistik Kosong')
  await page.goto(`/#workspace=${workspace.id}&view=statistics`)
  await expect(page.getByLabel('Total task', { exact: true })).toContainText('0')
  await expect(page.getByText('Belum ada task yang selesai.')).toBeVisible()
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ status: 403, json: { error: 'Akses workspace telah dicabut.' } }))
  await page.getByRole('button', { name: 'Perbarui statistik' }).click()
  await expect(page.getByRole('alert')).toContainText('Akses workspace telah dicabut.')
  await expect(page.getByLabel('Total task', { exact: true })).toHaveCount(0)
  await page.unroute('**/api/tasks.php*')
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(page.getByLabel('Total task', { exact: true })).toContainText('0')
})


test('AI: chat, membuat task, persistensi riwayat/board dan identitas pembuat', async ({ page }) => {
  const user = await register(page.request, 'ai-ui@example.com', 'User Asisten')
  const workspace = await createWorkspace(page.request, 'Tim Asisten AI')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Asisten AI' })
  await expect(dialog.getByLabel('Pesan untuk AI')).toBeEnabled()
  await dialog.getByLabel('Pesan untuk AI').fill('Halo, bantu saya merencanakan proyek')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('Saya bisa membantu merencanakan proyek di Tim Asisten AI.')
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click()
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('Halo, bantu saya merencanakan proyek')
  await dialog.getByLabel('Pesan untuk AI').fill('Saya ada project buat website profil untuk perusahaan tolong buatkan tugas-tugasnya dengan deadline 2030-10-10')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('3 task berhasil dibuat')
  await expect(dialog.getByRole('log')).toContainText('Riset kebutuhan perusahaan')
  const tasks = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks
  expect(tasks).toHaveLength(3)
  expect(tasks.every((task) => task.status === 'todo' && task.created_by === user.id && task.creator_name === 'User Asisten')).toBe(true)
  expect(tasks.find((task) => task.title === 'Riset kebutuhan perusahaan').deadline).toBe('2030-10-10')
  await page.screenshot({ path: 'test-results/ai-assistant-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ai-assistant-mobile.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(3)
})

test('AI API: retry tidak membuat duplikat, chat memakai konteks, akses dan riwayat terisolasi', async ({ page, playwright, baseURL }) => {
  await register(page.request, 'ai-api@example.com')
  const workspace = await createWorkspace(page.request, 'AI Workspace A')
  const other = await createWorkspace(page.request, 'AI Workspace B')
  const path = `/api/assistant.php?workspace_id=${workspace.id}`
  const id = crypto.randomUUID()
  const data = { message: 'Tolong buatkan task website perusahaan', request_id: id }
  const first = await page.request.post(path, { data })
  expect(first.status()).toBe(200)
  const result = await first.json()
  expect(result.tasks).toHaveLength(3)
  expect((await (await page.request.post(path, { data })).json())).toEqual(result)
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(3)
  expect((await page.request.post(path, { data: { ...data, message: 'Pesan berbeda' } })).status()).toBe(409)
  const chat = await page.request.post(path, { data: { message: 'ingat pesan pertama', request_id: crypto.randomUUID() } })
  expect((await chat.json()).reply).toContain(data.message)
  expect((await (await page.request.get(`/api/assistant.php?workspace_id=${other.id}`)).json()).messages).toHaveLength(0)
  const stranger = await playwright.request.newContext({ baseURL })
  try {
    expect((await stranger.post(path, { data })).status()).toBe(401)
    await register(stranger, 'ai-stranger@example.com')
    expect((await stranger.post(path, { data })).status()).toBe(403)
    await stranger.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    expect((await (await stranger.get(path)).json()).messages).toHaveLength(0)
    expect((await stranger.post(path, { data })).status()).toBe(409)
    const member = await stranger.post(path, { data: { message: 'buatkan task baru', request_id: crypto.randomUUID() } })
    expect(member.status()).toBe(200)
    expect((await member.json()).tasks).toHaveLength(3)
  } finally { await stranger.dispose() }
})

test('AI API: respons buruk dan kuota gagal tanpa batch task sebagian', async ({ page }) => {
  await register(page.request, 'ai-errors@example.com')
  const workspace = await createWorkspace(page.request, 'AI Gagal')
  const path = `/api/assistant.php?workspace_id=${workspace.id}`
  for (const [message, expected] of [['simulate_invalid', 422], ['simulate_unknown', 502], ['simulate_quota', 429], ['simulate_key', 502], ['simulate_incomplete', 502]]) {
    expect((await page.request.post(path, { data: { message, request_id: crypto.randomUUID() } })).status()).toBe(expected)
  }
  expect((await page.request.post(path, { data: { message: 'test', request_id: 'invalid' } })).status()).toBe(422)
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(0)
  expect((await (await page.request.get(path)).json()).messages).toHaveLength(0)
})

test('AI UI: error mempertahankan pesan, retry sukses dan tidak menggandakan task', async ({ page }) => {
  await register(page.request, 'ai-retry@example.com')
  const workspace = await createWorkspace(page.request, 'AI Retry')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Asisten AI' })
  let first = true
  await page.route('**/api/assistant.php*', async (route) => {
    if (route.request().method() === 'POST' && first) {
      first = false
      await route.fetch() // server sudah menyimpan; respons ke browser hilang
      return route.fulfill({ status: 502, json: { error: 'Koneksi terputus setelah simpan.' } })
    }
    return route.continue()
  })
  await dialog.getByLabel('Pesan untuk AI').fill('buatkan task website')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Koneksi terputus')
  await expect(dialog.getByLabel('Pesan untuk AI')).toHaveValue('buatkan task website')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('3 task berhasil dibuat')
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(3)
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
})

test('AI belum dikonfigurasi memberi petunjuk; file konfigurasi dan backup tidak publik', async ({ page }) => {
  await register(page.request, 'ai-config@example.com')
  const workspace = await createWorkspace(page.request, 'AI Konfigurasi')
  await page.route('**/api/assistant.php*', (route) => route.fulfill({ json: { configured: false, messages: [] } }))
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Asisten AI' })
  await expect(dialog.getByText('AI belum aktif.', { exact: false })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Kirim', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Muat ulang asisten' })).toBeVisible()
  expect((await page.request.get('http://127.0.0.1:8001/.env')).status()).toBe(404)
  expect((await page.request.get('http://127.0.0.1:8001/database/backup-before-task-attribution.local')).status()).toBe(404)
  expect((await page.request.get('http://127.0.0.1:8001/api/lib/env.php')).status()).toBe(404)
})

const toolCall = (name, tasks) => ({ type: 'function_call', name, arguments: { tasks } })
const toolMessage = (...calls) => `fixture_calls:${JSON.stringify(calls)}`
async function askAI(api, workspaceId, message, requestId = crypto.randomUUID()) {
  return api.post(`/api/assistant.php?workspace_id=${workspaceId}`, { data: { message, request_id: requestId } })
}

test('AI UI: edit tersimpan, board diperbarui dan retry hapus tidak menghapus task lain', async ({ page }) => {
  const user = await register(page.request, 'ai-edit-ui@example.com', 'Editor AI')
  const workspace = await createWorkspace(page.request, 'AI Edit Hapus')
  await askAI(page.request, workspace.id, 'buatkan task website')
  const original = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks.find((task) => task.title === 'Riset kebutuhan perusahaan')
  await page.goto(`/#workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'Mode gelap' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Asisten AI' })
  await dialog.getByLabel('Pesan untuk AI').fill('Ubah task Riset kebutuhan perusahaan menjadi Riset profil perusahaan, deadline 2030-11-20 dan status Done')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('1 task berhasil diedit')
  await expect(dialog.getByRole('region', { name: 'Task diedit' })).toContainText('Riset profil perusahaan')
  const edited = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks.find((task) => task.id === original.id)
  expect(edited).toMatchObject({ title: 'Riset profil perusahaan', description: original.description, deadline: '2030-11-20', status: 'done', created_by: original.created_by, created_at: original.created_at, completed_by: user.id })
  expect(edited.completed_at).toBeTruthy()
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click()
  await expect(region(page, 'Done').getByRole('article')).toContainText('Riset profil perusahaan')
  await page.reload()
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  await expect(dialog.getByRole('region', { name: 'Task diedit' })).toContainText('Riset profil perusahaan')
  let first = true
  await page.route('**/api/assistant.php*', async (route) => {
    if (route.request().method() === 'POST' && first) {
      first = false
      await route.fetch()
      return route.fulfill({ status: 502, json: { error: 'Respons hapus terputus.' } })
    }
    return route.continue()
  })
  await dialog.getByLabel('Pesan untuk AI').fill('Hapus task Riset profil perusahaan')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Respons hapus terputus')
  await dialog.getByRole('button', { name: 'Kirim', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('1 task berhasil dihapus')
  await expect(dialog.getByRole('region', { name: 'Task dihapus' })).toContainText('Riset profil perusahaan')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ai-edit-delete-mobile.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('button', { name: 'Asisten AI', exact: true }).click()
  await expect(dialog.getByRole('region', { name: 'Task dihapus' })).toContainText('Riset profil perusahaan')
})

test('AI API: edit parsial, status custom, penyelesai, retry dan izin member', async ({ page, playwright, baseURL }) => {
  const owner = await register(page.request, 'ai-edit-api@example.com', 'Pembuat AI')
  const workspace = await createWorkspace(page.request, 'API Edit AI')
  const { tasks: [original] } = await (await askAI(page.request, workspace.id, 'buatkan task website')).json()
  const column = (await (await page.request.post(`/api/columns.php?workspace_id=${workspace.id}`, { data: { label: 'Review AI', description: '', color: 'indigo' } })).json()).column
  const member = await otherAccount(playwright, baseURL, 'ai-editor-member@example.com', 'Penyelesai AI')
  try {
    const edit = toolMessage(toolCall('edit_tasks', [{ task_id: original.id, status: 'done', deadline: '2030-12-10' }]))
    expect((await askAI(member.api, workspace.id, edit)).status()).toBe(403)
    await member.api.post('/api/workspaces.php?action=join', { data: { invite_code: workspace.invite_code } })
    const id = crypto.randomUUID()
    const result = await (await askAI(member.api, workspace.id, edit, id)).json()
    expect(result.tasks).toHaveLength(0)
    const completed = result.updated_tasks[0]
    expect(completed).toMatchObject({ id: original.id, title: original.title, description: original.description, status: 'done', created_by: owner.id, created_at: original.created_at, completed_by: member.user.id, deadline: '2030-12-10' })
    expect(await (await askAI(member.api, workspace.id, edit, id)).json()).toEqual(result)
    const titleEdit = await (await askAI(page.request, workspace.id, toolMessage(toolCall('edit_tasks', [{ task_id: original.id, title: 'Riset selesai', description: 'Deskripsi baru', status: 'done', deadline: '' }])))).json()
    expect(titleEdit.updated_tasks[0]).toMatchObject({ title: 'Riset selesai', description: 'Deskripsi baru', deadline: null, completed_by: member.user.id, completed_at: completed.completed_at })
    const moved = await (await askAI(member.api, workspace.id, toolMessage(toolCall('edit_tasks', [{ task_id: original.id, status: column.id }])))).json()
    expect(moved.updated_tasks[0]).toMatchObject({ status: column.id, completed_by: null, completed_at: null })
    const deleted = await askAI(member.api, workspace.id, toolMessage(toolCall('delete_tasks', [{ task_id: original.id }])))
    expect(deleted.status()).toBe(200)
    expect((await deleted.json()).deleted_tasks[0].id).toBe(original.id)
    expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(2)
  } finally { await member.api.dispose() }
})

test('AI API: validasi semua tindakan, target workspace, duplikat dan batas batch', async ({ page }) => {
  await register(page.request, 'ai-edit-invalid@example.com')
  const workspace = await createWorkspace(page.request, 'Validasi Edit AI')
  const other = await createWorkspace(page.request, 'Target Lain')
  const { tasks } = await (await askAI(page.request, workspace.id, 'buat task website')).json()
  const { tasks: [outside] } = await (await askAI(page.request, other.id, 'buat task lain')).json()
  const cases = [
    [toolMessage(toolCall('delete_tasks', [{ task_id: tasks[0].id }]), toolCall('edit_tasks', [{ task_id: tasks[1].id, title: ' ' }])), 422],
    [toolMessage(toolCall('create_tasks', [{ title: 'Jangan tersimpan', description: '' }]), toolCall('edit_tasks', [{ task_id: tasks[0].id, status: 'missing-column' }])), 422],
    [toolMessage(toolCall('edit_tasks', [{ task_id: tasks[0].id, deadline: '2030-02-30' }])), 422],
    [toolMessage(toolCall('edit_tasks', [{ task_id: tasks[0].id }])), 422],
    [toolMessage(toolCall('edit_tasks', [{ task_id: outside.id, title: 'Tidak boleh' }])), 422],
    [toolMessage(toolCall('delete_tasks', [{ task_id: outside.id }])), 422],
    [toolMessage(toolCall('delete_tasks', [{ task_id: tasks[0].id }, { task_id: tasks[0].id }])), 422],
    [toolMessage(toolCall('edit_tasks', [{ task_id: tasks[0].id, title: 'X' }]), toolCall('delete_tasks', [{ task_id: tasks[0].id }])), 422],
    [toolMessage(toolCall('edit_tasks', [{ task_id: tasks[0].id, created_by: 'spoofed', title: 'X' }])), 502],
    [toolMessage(toolCall('create_tasks', Array.from({ length: 21 }, (_, i) => ({ title: `Task ${i}`, description: '' })))), 502],
  ]
  for (const [message, status] of cases) expect((await askAI(page.request, workspace.id, message)).status()).toBe(status)
  const current = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks
  expect(current.sort((a, b) => a.id.localeCompare(b.id))).toEqual([...tasks].sort((a, b) => a.id.localeCompare(b.id)))
  expect((await (await page.request.get(tasksPath(other.id))).json()).tasks.find((task) => task.id === outside.id)).toEqual(outside)
  expect((await (await page.request.get(`/api/assistant.php?workspace_id=${workspace.id}`)).json()).messages).toHaveLength(2)
  const mixed = await askAI(page.request, workspace.id, toolMessage(toolCall('delete_tasks', [{ task_id: tasks[0].id }]), toolCall('edit_tasks', [{ task_id: tasks[1].id, title: 'Judul diperbarui' }]), toolCall('create_tasks', [{ title: 'Task tambahan', description: '' }])))
  expect(mixed.status()).toBe(200)
  const result = await mixed.json()
  expect(result.deleted_tasks).toHaveLength(1)
  expect(result.updated_tasks).toHaveLength(1)
  expect(result.tasks).toHaveLength(1)
  expect((await (await page.request.get(tasksPath(workspace.id))).json()).tasks).toHaveLength(3)
})

test('AI: target ambigu tidak berubah dan task yang berubah saat proses tidak dihapus', async ({ page }) => {
  await register(page.request, 'ai-stale@example.com')
  const workspace = await createWorkspace(page.request, 'AI Target')
  const { tasks: [task] } = await (await askAI(page.request, workspace.id, 'buatkan task')).json()
  await page.request.post(tasksPath(workspace.id), { data: { title: task.title, description: 'Task dengan nama sama' } })
  const ambiguous = await askAI(page.request, workspace.id, 'Ubah task Riset kebutuhan perusahaan menjadi task lain')
  expect(ambiguous.status()).toBe(200)
  const response = await ambiguous.json()
  expect(response.reply).toContain('Task mana')
  expect(response.updated_tasks).toHaveLength(0)
  expect((await askAI(page.request, workspace.id, `simulate_changed:${task.id}`)).status()).toBe(409)
  const remaining = (await (await page.request.get(tasksPath(workspace.id))).json()).tasks
  expect(remaining).toHaveLength(4)
  expect(remaining.find((item) => item.id === task.id).title).toBe('Judul diubah anggota lain')
})
