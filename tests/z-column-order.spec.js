import { test, expect } from '@playwright/test'

const regions = (page) => page.locator('section.kanban-column')
const labels = (page) => regions(page).getByRole('heading', { level: 3 })
const handle = (page, id) => page.locator(`[data-column-handle="${id}"]`)

async function dragColumn(page, id, targetId, placement = 'before', vertical = false) {
  const source = handle(page, id)
  const target = page.locator(`[data-column-id="${targetId}"]`)
  await source.scrollIntoViewIfNeeded()
  const start = await source.boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2 + 5, { steps: 5 })
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  const x = box.x + (vertical ? 30 : placement === 'after' ? box.width - 30 : 30)
  const y = box.y + (vertical && placement === 'after' ? box.height - 30 : 30)
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.move(x + 1, y + 1)
  await page.mouse.up()
}

test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith('kolom tambahan')) return
  await page.route('**/api/auth.php*', (route) => route.fulfill({ json: { user: { id: 'test-user', name: 'Tester', email: 'test@example.com' } } }))
  await page.route('**/api/workspaces.php*', (route) => route.fulfill({ json: { workspaces: [{ id: 'test-workspace', name: 'Test Board', role: 'owner' }] } }))
})

test('kolom tambahan bisa disisipkan, urutan tersimpan, dan API menolak daftar tidak valid', async ({ page, playwright, baseURL }) => {
  const request = page.request
  expect((await request.post('/api/auth.php?action=register', { data: { name: 'Column Tester', email: `columns-${Date.now()}@example.com`, password: 'demo1234' } })).status()).toBe(201)
  const workspace = (await (await request.post('/api/workspaces.php', { data: { name: 'Column Test Board', description: '' } })).json()).workspace
  const other = (await (await request.post('/api/workspaces.php', { data: { name: 'Other Board', description: '' } })).json()).workspace
  const endpoint = `/api/columns.php?workspace_id=${workspace.id}`
  const otherEndpoint = `/api/columns.php?workspace_id=${other.id}`
  const otherBefore = (await (await request.get(otherEndpoint)).json()).columns
  const initial = (await (await request.get(endpoint)).json()).columns
  const name = `Masalah ${Date.now()}`
  let id
  try {
    const created = await request.post(endpoint, { data: { label: name, color: 'rose' } })
    expect(created.status()).toBe(201)
    id = (await created.json()).column.id
    await page.goto(`/#workspace=${workspace.id}`)
    const expected = [...initial.map((column) => column.label), name]
    await expect(labels(page)).toHaveText(expected)
    const targetIndex = initial.findIndex((column) => column.id === 'in_progress') + 1
    await dragColumn(page, id, initial[targetIndex].id)
    expected.pop()
    expected.splice(targetIndex, 0, name)
    await expect(labels(page)).toHaveText(expected)
    await page.reload()
    await expect(labels(page)).toHaveText(expected)
    const saved = (await (await request.get(endpoint)).json()).columns
    expect(saved.map((column) => column.label)).toEqual(expected)
    expect(saved.map((column) => column.sort_order)).toEqual(saved.map((_, index) => index + 1))
    await expect(page.getByRole('button', { name: /^Geser kolom / })).toHaveCount(0)
    for (const id of ['todo', 'in_progress', 'done']) {
      const index = saved.findIndex((column) => column.id === id)
      await expect(regions(page).nth(index).getByRole('button', { name: /^Hapus kolom / })).toHaveCount(0)
    }
    for (const column_ids of [saved.map(() => 'todo'), ['todo'], saved.map((column) => column.id === id ? 'unknown' : column.id)]) {
      const invalid = await request.patch(endpoint, { data: { column_ids } })
      expect(invalid.status()).toBe(422)
    }
    const after = (await (await request.get(endpoint)).json()).columns
    expect(after).toEqual(saved)
    expect((await (await request.get(otherEndpoint)).json()).columns).toEqual(otherBefore)
    const outsider = await playwright.request.newContext({ baseURL })
    try {
      const data = { column_ids: saved.map((column) => column.id) }
      expect((await outsider.patch(endpoint, { data })).status()).toBe(401)
      await outsider.post('/api/auth.php?action=register', { data: { name: 'Outsider', email: `outsider-${Date.now()}@example.com`, password: 'demo1234' } })
      expect((await outsider.patch(endpoint, { data })).status()).toBe(403)
    } finally { await outsider.dispose() }
  } finally {
    if (id) await request.delete(`${endpoint}&id=${encodeURIComponent(id)}`)
    const current = (await (await request.get(endpoint)).json()).columns
    const currentIds = new Set(current.map((column) => column.id))
    const restored = [...initial.filter((column) => currentIds.has(column.id)), ...current.filter((column) => !initial.some((old) => old.id === column.id))]
    await request.patch(endpoint, { data: { column_ids: restored.map((column) => column.id) } })
  }
})

const sampleColumns = [
  { id: 'todo', label: 'To Do', color: 'indigo', sort_order: 1 },
  { id: 'in_progress', label: 'In Progress', color: 'amber', sort_order: 2 },
  { id: 'done', label: 'Done', color: 'emerald', sort_order: 3 },
  { id: 'masalah', label: 'Masalah', color: 'rose', sort_order: 4 },
]

test('drag vertikal tersimpan setelah reload pada viewport ponsel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let columns = [...sampleColumns]
  await page.route('**/api/columns.php*', (route) => {
    if (route.request().method() === 'PATCH') columns = route.request().postDataJSON().column_ids.map((id) => columns.find((column) => column.id === id))
    return route.fulfill({ json: { columns } })
  })
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ json: { tasks: [] } }))
  await page.goto('/#workspace=test-workspace')
  await dragColumn(page, 'masalah', 'done', 'before', true)
  await expect(labels(page)).toHaveText(['To Do', 'In Progress', 'Masalah', 'Done'])
  await page.reload()
  await expect(labels(page)).toHaveText(['To Do', 'In Progress', 'Masalah', 'Done'])
  await dragColumn(page, 'masalah', 'done', 'after', true)
  await expect(labels(page)).toHaveText(['To Do', 'In Progress', 'Done', 'Masalah'])
})

test('penolakan server ditampilkan tanpa mengubah urutan papan', async ({ page }) => {
  await page.route('**/api/columns.php*', (route) => route.fulfill(route.request().method() === 'PATCH'
    ? { status: 422, json: { error: 'Daftar kolom berubah. Muat ulang halaman sebelum mengatur urutan.' } }
    : { json: { columns: sampleColumns } }))
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ json: { tasks: [] } }))
  await page.goto('/#workspace=test-workspace')
  await dragColumn(page, 'masalah', 'done')
  await expect(page.getByRole('alert')).toContainText('Daftar kolom berubah')
  await expect(labels(page)).toHaveText(sampleColumns.map((column) => column.label))
  await expect(handle(page, 'masalah')).toHaveAttribute('draggable', 'true')
})

test('keyboard tetap bisa mengatur urutan dan melewati batas tidak mengirim request', async ({ page }) => {
  let columns = [...sampleColumns]
  let writes = 0
  await page.route('**/api/columns.php*', (route) => {
    if (route.request().method() === 'PATCH') {
      writes++
      columns = route.request().postDataJSON().column_ids.map((id) => columns.find((column) => column.id === id))
    }
    return route.fulfill({ json: { columns } })
  })
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ json: { tasks: [] } }))
  await page.goto('/#workspace=test-workspace')
  await handle(page, 'todo').press('ArrowLeft')
  await handle(page, 'masalah').press('ArrowRight')
  await handle(page, 'masalah').press('ArrowLeft')
  await expect(labels(page)).toHaveText(['To Do', 'In Progress', 'Masalah', 'Done'])
  expect(writes).toBe(1)
})

test('drag kartu hanya memindahkan task dan drag kolom yang dibatalkan tidak disimpan', async ({ page }) => {
  let columnWrites = 0
  let task = { id: 'test-card', title: 'Kartu uji drag', description: '', status: 'todo', created_at: '2026-10-03T00:00:00Z' }
  await page.route('**/api/columns.php*', (route) => {
    if (route.request().method() === 'PATCH') columnWrites++
    return route.fulfill({ json: { columns: sampleColumns } })
  })
  await page.route('**/api/tasks.php*', (route) => {
    if (route.request().method() === 'PATCH') task = { ...task, ...route.request().postDataJSON() }
    return route.fulfill({ json: { tasks: [task], task } })
  })
  await page.goto('/#workspace=test-workspace')
  await page.getByRole('article', { name: task.title }).dragTo(page.locator('[data-column-id="in_progress"] section'), { targetPosition: { x: 150, y: 200 } })
  await expect(page.locator('[data-column-id="in_progress"]').getByRole('article', { name: task.title })).toBeVisible()
  const box = await handle(page, 'todo').boundingBox()
  await page.mouse.move(box.x + 30, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 50, box.y + 15, { steps: 5 })
  await page.mouse.move(100, 100, { steps: 10 })
  await page.mouse.up()
  await expect(labels(page)).toHaveText(sampleColumns.map((column) => column.label))
  await expect(page.locator('.column-dragging')).toHaveCount(0)
  expect(columnWrites).toBe(0)
})

test('backend tidak tersedia menampilkan error tanpa mengubah urutan', async ({ page }) => {
  await page.route('**/api/columns.php*', (route) => route.request().method() === 'PATCH' ? route.abort() : route.fulfill({ json: { columns: sampleColumns } }))
  await page.route('**/api/tasks.php*', (route) => route.fulfill({ json: { tasks: [] } }))
  await page.goto('/#workspace=test-workspace')
  await dragColumn(page, 'masalah', 'done')
  await expect(page.getByRole('alert')).toContainText('Server belum dapat dihubungi')
  await expect(labels(page)).toHaveText(sampleColumns.map((column) => column.label))
})
