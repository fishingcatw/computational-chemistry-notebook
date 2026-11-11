import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { domainDefinitions, trackDefinitions } from '../../src/taxonomy.js';
import { legacyCatalog } from '../fixtures/legacy-catalog.mjs';

const catalog = JSON.parse(await readFile(new URL('../../public/content/catalog.json', import.meta.url)));

test('five domains and three directions show exact descriptions; combined filtering follows into tasks', async ({ page }) => {
  await page.goto('/#/map');
  await expect(page.locator('.module-card')).toHaveCount(5);
  await expect(page.locator('.direction-card')).toHaveCount(3);
  for (const module of domainDefinitions) {
    const card = page.locator(`[data-module="${module.id}"]`);
    await expect(card.getByRole('heading')).toHaveText(module.title);
    await expect(card.locator('.module-description')).toHaveText(module.description);
  }
  for (const track of trackDefinitions) await expect(page.getByText(track.description, { exact: true })).toBeVisible();
  await page.locator('.direction-card').filter({ hasText: '前沿求解' }).click();
  await expect(page.getByRole('button', { name: '前沿求解', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.module-card')).toHaveCount(2);
  await page.getByRole('searchbox').fill('状态方程');
  await expect(page.locator('.module-card')).toHaveCount(1);
  await page.locator('.module-card').click();
  await expect(page.locator('.task-title')).toHaveText('预算约束下的状态方程研究');
  await expect(page.locator('#task-module')).toHaveValue('materials');
  await expect(page.locator('#task-track')).toHaveValue('前沿求解');
  await expect(page.locator('.task-list-item')).toHaveCount(2);
  await page.getByRole('link', { name: '中文解读', exact: true }).click();
  await expect(page.locator('#task-track')).toHaveValue('前沿求解');
  await page.getByRole('link', { name: '返回题目地图' }).click();
  await expect(page.locator('.module-card')).toHaveCount(2);
  await page.getByRole('button', { name: '全部任务方向', exact: true }).click();
  await expect(page.locator('.module-card')).toHaveCount(5);
});

test('all legacy module URLs including task and tab resolve, even with a legacy online catalog', async ({ page }) => {
  await page.route('**/content/catalog.json', (route) => route.fulfill({ json: legacyCatalog(catalog) }));
  for (const [legacy, id, current] of [
    ['molecular', 'CHEM-001', 'molecular'], ['reactions', 'CHEM-002', 'reactions'],
    ['electronic', 'MAT-001', 'materials'], ['stability', 'MAT-002', 'materials'],
    ['dynamics', 'MD-001', 'dynamics'], ['surfaces', 'SURF-001', 'materials'], ['learning', 'ML-001', 'learning'],
  ]) {
    await page.goto(`/#/benchmarks?module=${legacy}&task=${id}&tab=explanation`);
    await expect(page.locator('#task-module')).toHaveValue(current);
    await expect(page.getByRole('heading', { name: '这道题在考什么？' })).toBeVisible();
    await expect(page.locator('.task-category')).toContainText(id);
  }
  await page.goto('/#/benchmarks?module=electronic');
  await expect(page.locator('#task-module')).toHaveValue('materials');
  await expect(page.locator('.task-list-item')).toHaveCount(3);
  await page.goto('/#/map?track=改进优化');
  await expect(page.locator('.module-card')).toHaveCount(1);
  await expect(page.locator('[data-module="learning"]')).toBeVisible();
  await page.goto('/#/benchmarks?module=does-not-exist');
  await expect(page.getByRole('heading', { name: '题目尚未收录' })).toBeVisible();
});

test('long titles fit without horizontal page overflow on mobile and tablet', async ({ page }) => {
  await page.goto('/#/map');
  for (const width of [320, 768, 1080]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.module-card')).toHaveCount(5);
    const fits = await page.locator('.site-surface').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits, `map content at ${width}px`).toBe(true);
  }
});
