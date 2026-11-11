import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const fixture = JSON.parse(await readFile(new URL('../../public/content/catalog.json', import.meta.url)));
const key = 'research-notebook:/:catalog:v1';

async function createTask(page) {
  await page.goto('/#/manage');
  await page.getByRole('button', { name: '＋ 新增题目' }).click();
  const dialog = page.locator('#task-editor');
  await expect(dialog.locator('[name="module"] option')).toHaveCount(5);
  await expect(dialog.locator('[name="track"] option')).toHaveText(['前沿求解', '开放研究与优化', '专业软件与工作流']);
  await dialog.getByLabel('领域模块', { exact: true }).selectOption('learning');
  await dialog.getByLabel('任务方向', { exact: true }).selectOption('开放研究与优化');
  await dialog.getByLabel('题目编号', { exact: false }).fill('CHEM-LOCAL');
  await dialog.getByLabel('中文题目名称', { exact: false }).fill('本地新增题目');
  await dialog.getByLabel('摘要', { exact: false }).fill('只保存在此浏览器的测试内容');
  await dialog.getByRole('button', { name: '保存到此浏览器' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.task-title')).toHaveText('本地新增题目');
}

test('any visitor can create and edit persistently without remote write or authentication', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  await createTask(page);
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText('本地新增题目');
  await page.getByRole('button', { name: '编辑题目', exact: true }).click();
  const dialog = page.locator('#task-editor');
  await dialog.getByLabel('中文题目名称', { exact: false }).fill('修改后的题目');
  await dialog.getByRole('button', { name: '保存到此浏览器' }).click();
  await expect(page.locator('.task-title')).toHaveText('修改后的题目');
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText('修改后的题目');
  expect(requests.every((r) => ['GET', 'HEAD'].includes(r.method))).toBe(true);
  expect(requests.filter((r) => r.url.startsWith('http')).every((r) => new URL(r.url).hostname === '127.0.0.1')).toBe(true);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('local edits stay isolated from another browser context', async ({ page, browser, baseURL }) => {
  await createTask(page);
  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto(`${baseURL}/#/manage`);
    await expect(visitor.locator('.managed-task')).toHaveCount(fixture.tasks.length);
    await expect(visitor.getByRole('button', { name: '＋ 新增题目' })).toBeVisible();
    await expect(visitor.getByText('本地新增题目', { exact: true })).toHaveCount(0);
  } finally { await other.close(); }
});

test('export, reset and reimport round trip preserves full tasks', async ({ page }) => {
  await createTask(page);
  await page.getByRole('link', { name: '题目管理', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出题库 JSON' }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe('catalog.json');
  const data = JSON.parse(await readFile(await exported.path(), 'utf8'));
  expect(data.tasks).toHaveLength(fixture.tasks.length + 1);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '恢复项目题库' }).click();
  await expect(page.locator('.managed-task')).toHaveCount(fixture.tasks.length);
  await page.locator('#catalog-file').setInputFiles({ name: 'catalog.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.locator('.managed-task')).toHaveCount(fixture.tasks.length + 1);
  await page.reload();
  await expect(page.getByText('本地新增题目', { exact: true })).toBeVisible();
});

test('invalid import is rejected without overwriting local edits', async ({ page }) => {
  await createTask(page);
  await page.goto('/#/manage');
  page.on('dialog', (dialog) => dialog.accept());
  const invalid = structuredClone(fixture);
  invalid.tasks[0].sources = [{ label: 'unsafe', url: 'javascript:alert(1)' }];
  await page.locator('#catalog-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.locator('#catalog-error')).toContainText('来源链接格式错误');
  await page.reload();
  await expect(page.getByText('本地新增题目', { exact: true })).toBeVisible();
});

test('storage failure retains the draft; concurrent edits are not silently overwritten', async ({ page }) => {
  await page.goto('/#/benchmarks?task=CHEM-001');
  await page.getByRole('button', { name: '编辑题目', exact: true }).click();
  const dialog = page.locator('#task-editor');
  await dialog.getByLabel('中文题目名称', { exact: false }).fill('保留我的修改');
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  });
  await dialog.getByRole('button', { name: '保存到此浏览器' }).click();
  await expect(dialog.getByRole('alert')).toContainText('无法保存');
  await expect(dialog.locator('[name="title"]')).toHaveValue('保留我的修改');
  const concurrent = structuredClone(fixture);
  concurrent.tasks[0].title = '其他标签页修改';
  await page.evaluate(({ key, catalog }) => {
    Storage.prototype.setItem = window.originalSetItem;
    localStorage.setItem(key, JSON.stringify({ schemaVersion: '1.0', catalog }));
  }, { key, catalog: concurrent });
  await dialog.getByRole('button', { name: '保存到此浏览器' }).click();
  await expect(dialog.getByRole('alert')).toContainText('其他标签页更新');
  await expect(dialog.locator('[name="title"]')).toHaveValue('保留我的修改');
});

test('damaged local storage is recoverable without deleting it on load', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{not-json'), key);
  await page.goto('/#/manage');
  await page.reload();
  await expect(page.getByText(/本地题库损坏/).first()).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{not-json');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '恢复项目题库' }).click();
  await page.getByRole('button', { name: '＋ 新增题目' }).click();
  await expect(page.locator('#task-editor')).toBeVisible();
});
