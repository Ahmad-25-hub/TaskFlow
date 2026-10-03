import { test, expect } from '@playwright/test'

const column = (page, status) => page.getByRole('region', { name: status, exact: true })
const card = (page, title) => page.getByRole('article', { name: title, exact: true })

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('data dummy, jumlah task, dan progress tampil sesuai status', async ({ page }) => {
  await expect(page.getByRole('article')).toHaveCount(7)
  await expect(column(page, 'To Do').getByRole('article')).toHaveCount(3)
  await expect(column(page, 'In Progress').getByRole('article')).toHaveCount(2)
  await expect(column(page, 'Done').getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '29')
})

test('tambah task dengan judul, deskripsi, tanggal, dan status pilihan', async ({ page }) => {
  await page.getByRole('button', { name: 'Tambah task ke In Progress', exact: true }).click()
  await expect(page.getByLabel('Status awal')).toHaveValue('in_progress')
  await page.getByLabel('Judul task').fill('  Uji demo hackathon  ')
  await page.getByLabel('Deskripsi (opsional)').fill('Task pengujian frontend.')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const newTask = card(page, 'Uji demo hackathon')
  await expect(column(page, 'In Progress').getByRole('article', { name: 'Uji demo hackathon' })).toBeVisible()
  await expect(newTask).toContainText('Task pengujian frontend.')
  const createdAt = await newTask.locator('time').getAttribute('datetime')
  expect(Math.abs(Date.now() - Date.parse(createdAt))).toBeLessThan(10000)
  await expect(page.getByRole('article')).toHaveCount(8)
})

test('judul kosong atau spasi ditolak dan modal dapat dibatalkan', async ({ page }) => {
  await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Judul task').fill('   ')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(page.getByText('Judul task perlu diisi.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(7)
})

test('pilihan status memindahkan task ke semua kolom dan memperbarui progress', async ({ page }) => {
  const title = 'Rancang landing page'
  await page.getByLabel(`Status task ${title}`).selectOption('in_progress')
  await expect(column(page, 'In Progress').getByRole('article', { name: title })).toBeVisible()
  await page.getByLabel(`Status task ${title}`).selectOption('done')
  await expect(column(page, 'Done').getByRole('article', { name: title })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '43')
  await page.getByLabel(`Status task ${title}`).selectOption('todo')
  await expect(column(page, 'To Do').getByRole('article', { name: title })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(7)
})

test('drag-and-drop memindahkan kartu tanpa menggandakan data', async ({ page }) => {
  await card(page, 'Rancang landing page').dragTo(column(page, 'In Progress'))
  await expect(column(page, 'In Progress').getByRole('article', { name: 'Rancang landing page' })).toBeVisible()
  await card(page, 'Rancang landing page').dragTo(column(page, 'Done'))
  await expect(column(page, 'Done').getByRole('article', { name: 'Rancang landing page' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(7)
})

test('hapus task dan tampilkan keadaan kosong; reload mengembalikan dummy', async ({ page }) => {
  for (const title of ['Tentukan konsep project', 'Siapkan workspace']) {
    await page.getByRole('button', { name: `Hapus task ${title}`, exact: true }).click()
  }
  await expect(column(page, 'Done').getByRole('article')).toHaveCount(0)
  await expect(column(page, 'Done').getByText('Belum ada task di sini')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('article')).toHaveCount(5)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(7)
})

test('pencarian judul/deskripsi, filter status, dan hasil kosong', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Cari task' }).fill('WIREFRAME')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(card(page, 'Rancang landing page')).toBeVisible()
  await page.getByRole('button', { name: 'Bersihkan pencarian' }).click()
  await page.getByLabel('Filter status').selectOption('done')
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('textbox', { name: 'Cari task' }).fill('tidak ada hasil')
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByText('Tidak ada task yang cocok')).toHaveCount(3)
})

test('keyboard modal menjaga fokus dan mengembalikannya ke tombol pembuka', async ({ page }) => {
  const openButton = page.getByRole('button', { name: 'Tambah task', exact: true }).first()
  await openButton.click()
  await expect(page.getByLabel('Judul task')).toBeFocused()
  await page.getByRole('button', { name: 'Buat task', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Tutup form' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Buat task', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(openButton).toBeFocused()
})

test('layar kecil tanpa overflow, form dan pindah status tetap berfungsi', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Tambah task ke Done', exact: true }).click()
  await page.getByLabel('Judul task').fill('Task mobile')
  await page.getByRole('button', { name: 'Buat task', exact: true }).click()
  await expect(column(page, 'Done').getByRole('article', { name: 'Task mobile' })).toBeVisible()
  await page.getByLabel('Status task Task mobile', { exact: true }).selectOption('todo')
  await expect(column(page, 'To Do').getByRole('article', { name: 'Task mobile' })).toBeVisible()
})
