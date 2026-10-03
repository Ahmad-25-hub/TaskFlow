import { test, expect } from '@playwright/test'

const column = (page, status) => page.getByRole('region', { name: status, exact: true })

test('task tersimpan setelah reload, dapat dipindah dan dihapus', async ({ page, request }) => {
  const title = `Uji integrasi ${Date.now()}`
  let id
  try {
    const before = await (await request.get('/api/tasks.php')).json()
    const initialCount = before.tasks.length
    await page.goto('/')
    await expect(page.getByRole('article')).toHaveCount(initialCount)
    await page.getByRole('button', { name: 'Tambah task', exact: true }).first().click()
    await page.getByLabel('Judul task').fill(title)
    await page.getByLabel('Deskripsi (opsional)').fill('Data harus tetap ada setelah reload.')
    await page.getByRole('button', { name: 'Buat task', exact: true }).click()
    const card = page.getByRole('article', { name: title })
    await expect(card).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(initialCount + 1)
    const listed = await (await request.get('/api/tasks.php')).json()
    id = listed.tasks.find((task) => task.title === title)?.id
    expect(id).toBeTruthy()

    await page.reload()
    await expect(card).toBeVisible()
    await page.getByLabel(`Status task ${title}`).selectOption('done')
    await expect(column(page, 'Done').getByRole('article', { name: title })).toBeVisible()
    await expect.poll(async () => {
      const result = await (await request.get('/api/tasks.php')).json()
      return result.tasks.find((task) => task.id === id)?.status
    }).toBe('done')
    await page.getByRole('button', { name: `Hapus task ${title}` }).click()
    await expect(card).toHaveCount(0)
    await page.reload()
    await expect(card).toHaveCount(0)
  } finally {
    if (!id) {
      const result = await (await request.get('/api/tasks.php')).json()
      id = result.tasks.find((task) => task.title === title)?.id
    }
    if (id) await request.delete(`/api/tasks.php?id=${encodeURIComponent(id)}`)
  }
})
