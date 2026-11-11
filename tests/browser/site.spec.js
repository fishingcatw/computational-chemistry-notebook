import { test, expect } from '@playwright/test';

test('research interests stay centered on one line across viewport widths', async ({ page }) => {
  await page.goto('/#/about');
  await expect(page.locator('.research-interests p')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 768, 1080, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const measurements = await page.locator('.research-interests p').evaluateAll((items) => items.map((item) => {
      const range = document.createRange();
      range.selectNodeContents(item);
      const bounds = item.getBoundingClientRect();
      const text = range.getBoundingClientRect();
      return {
        lines: range.getClientRects().length,
        fits: text.width <= bounds.width + 1,
        centerOffset: Math.abs((text.left + text.right) / 2 - (bounds.left + bounds.right) / 2),
      };
    }));
    for (const item of measurements) {
      expect(item.lines, `line count at ${width}px`).toBe(1);
      expect(item.fits, `text width at ${width}px`).toBe(true);
      expect(item.centerOffset, `centering at ${width}px`).toBeLessThan(1);
    }
  }
});

test('about, module map, task tabs and return navigation work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Yanqing Fang', exact: true })).toBeVisible();
  await expect(page.locator('.featured-card')).toHaveCount(2);
  await expect(page.locator('.portrait-photo')).toHaveAttribute('src', /avatar-cat\.jpg$/);
  await expect.poll(() => page.locator('.portrait-photo').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.featured-art')).toHaveCount(0);
  await expect(page.locator('.profile-links, .social-icon')).toHaveCount(0);
  await expect(page.locator('.profile-focus')).toHaveText('Computational Chemistry');
  await expect(page.locator('.research-interests')).toHaveCSS('text-align', 'center');
  await expect(page.locator('.research-interests p')).toHaveText([
    'Molecular Simulation',
    'Materials Modeling',
    'Scientific Agent Evaluation',
  ]);
  await expect(page.locator('.site-surface')).toBeVisible();
  const like = page.getByRole('button', { name: '收藏本站（仅保存在此浏览器）' });
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: '收藏本站（仅保存在此浏览器）' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: '跳到主要内容' }).focus();
  await page.getByRole('link', { name: '跳到主要内容' }).press('Enter');
  await expect(page).toHaveURL(/#\/about$/);
  await page.getByRole('link', { name: '题目地图', exact: true }).click();
  await expect(page.locator('.module-card')).toHaveCount(5);
  await expect(page.locator('.direction-card')).toHaveCount(3);
  await page.getByRole('button', { name: '前沿求解', exact: true }).click();
  await expect(page.locator('.module-card')).toHaveCount(2);
  await page.getByRole('button', { name: '全部任务方向', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索方向、题目或关键词' }).fill('扩散');
  await expect(page.locator('.module-card')).toHaveCount(1);
  await page.locator('.module-card').click();
  await expect(page.getByRole('heading', { name: '扩散系数估计与采样诊断', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '中文解读', exact: true }).click();
  await expect(page.getByRole('heading', { name: '这道题在考什么？' })).toBeVisible();
  await page.getByRole('link', { name: /评测结果/ }).click();
  await expect(page.getByRole('heading', { name: '等待第一份评测结果' })).toBeVisible();
  await page.getByRole('link', { name: '返回题目地图' }).click();
  await expect(page.locator('.module-card')).toHaveCount(5);
});

test('trace example, filter, JSON, local file validation and download', async ({ page }) => {
  await page.goto('/#/benchmarks?module=molecular&task=CHEM-001&tab=traces');
  await page.getByRole('button', { name: /查看结构示例/ }).click();
  await expect(page.locator('.trace-event')).toHaveCount(4);
  await expect(page.getByText('版式示例 · 不代表真实执行或评测结果')).toBeVisible();
  await page.getByRole('button', { name: '工具调用', exact: true }).click();
  await expect(page.locator('.trace-event')).toHaveCount(1);
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  await expect(page.locator('.json-view')).toContainText('layout-example-only');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '格式模板' }).click();
  expect((await download).suggestedFilename()).toBe('CHEM-001-trace-template.json');
  await page.getByRole('button', { name: '清除', exact: true }).click();
  await page.locator('#trace-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('alert')).toContainText('schemaVersion');
  await page.locator('#trace-file').setInputFiles({ name: 'safe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: '1.0', taskId: 'CHEM-001', runId: 'local-test', events: [{ id: '1', type: 'tool', title: '安全显示', content: '<img src=x onerror="window.injected=true">' }] })) });
  await expect(page.locator('.event-content')).toContainText('<img');
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await expect(page.getByText(/本地预览 · 未上传/)).toBeVisible();
});

test('theme persists, empty filter resets, dialog works, no horizontal overflow', async ({ page }) => {
  await page.goto('/#/map');
  await page.getByRole('searchbox').fill('not-a-research-field');
  await expect(page.getByText('没有找到匹配的研究方向')).toBeVisible();
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('.module-card')).toHaveCount(5);
  await page.getByRole('button', { name: '切换深浅色主题' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: '内容维护', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '明白了' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#/benchmarks?module=missing');
  await expect(page.getByRole('heading', { name: '题目尚未收录' })).toBeVisible();
});

test('published result links to its trace and stays distinct from local preview', async ({ page }) => {
  const run = { id: 'browser-fixture', taskId: 'CHEM-001', agent: 'Fixture Agent', model: 'Fixture Model', score: 1, metricName: 'fixture-only', durationSeconds: 30, tokens: 100, status: 'passed', tracePath: 'content/traces/fixture.json' };
  await page.route('**/content/runs.json', (route) => route.fulfill({ json: { runs: [run] } }));
  await page.route('**/content/traces/fixture.json', (route) => route.fulfill({ json: { schemaVersion: '1.0', taskId: 'CHEM-001', runId: run.id, events: [{ id: '1', type: 'verifier', title: '测试记录', content: '仅供浏览器测试，不发布到网站。' }] } }));
  await page.goto('/#/benchmarks?module=molecular&task=CHEM-001&tab=results');
  await expect(page.getByText('Fixture Agent')).toBeVisible();
  await page.getByRole('button', { name: '查看 Trace' }).click();
  await expect(page.getByText('已归档运行记录 · 与当前题目及运行 ID 关联')).toBeVisible();
  await expect(page.locator('.trace-event')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /Fixture Agent/ }).click();
  await expect(page.getByText('已归档运行记录 · 与当前题目及运行 ID 关联')).toBeVisible();
});
