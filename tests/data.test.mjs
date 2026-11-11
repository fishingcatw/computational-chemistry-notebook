import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalog, validateTrace, validateRuns, matchingModules, escapeHtml, safeUrl, safeAssetPath } from '../src/data.js';

const catalog = JSON.parse(await readFile(new URL('../public/content/catalog.json', import.meta.url)));
const example = JSON.parse(await readFile(new URL('../public/content/trace-example.json', import.meta.url)));

test('five domains link to valid tasks', () => {
  assert.equal(validateCatalog(catalog).modules.length, 5);
  for (const module of catalog.modules) assert.ok(catalog.tasks.some((task) => task.module === module.id));
});
test('module search matches task and English keywords plus direction', () => {
  assert.equal(matchingModules(catalog, { query: '扩散' })[0].id, 'dynamics');
  assert.equal(matchingModules(catalog, { query: 'Conformer' })[0].id, 'molecular');
  assert.equal(matchingModules(catalog, { track: '前沿求解' }).length, 2);
  assert.equal(matchingModules(catalog, { track: '开放研究与优化' }).length, 1);
  assert.equal(matchingModules(catalog, { track: '专业软件与工作流' }).length, 3);
  assert.equal(matchingModules(catalog, { track: '改进优化' }).length, 1);
  assert.equal(matchingModules(catalog, { query: '过渡态', track: '开放研究与优化' }).length, 0);
  assert.equal(matchingModules(catalog, { query: 'nothing-matches' }).length, 0);
});
test('trace importer enforces task ownership, schema and unique IDs', () => {
  assert.equal(validateTrace(example, 'CHEM-001').events.length, 4);
  assert.throws(() => validateTrace(example, 'MAT-001'), /不一致/);
  assert.throws(() => validateTrace({ ...example, schemaVersion: '0' }, 'CHEM-001'));
  assert.throws(() => validateTrace({ ...example, events: [example.events[0], example.events[0]] }, 'CHEM-001'));
  assert.throws(() => validateTrace({ ...example, events: [{ ...example.events[0], content: 'a'.repeat(20001) }] }, 'CHEM-001'));
});
test('unsafe links and executable HTML stay inert', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://name:pass@example.com'), '');
  assert.ok(safeUrl('https://example.com/'));
  assert.equal(safeAssetPath('content/../../.env'), false);
  assert.equal(safeAssetPath('https://example.com/test.json'), false);
  assert.equal(safeAssetPath('content/traces/test.json'), true);
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('run score needs an explicit metric and known task', () => {
  const run = { id: 'run-1', taskId: 'CHEM-001', agent: 'Test', model: 'Test', score: 1, status: 'passed' };
  assert.throws(() => validateRuns({ runs: [run] }, catalog), /metricName/);
  assert.equal(validateRuns({ runs: [{ ...run, metricName: 'pass' }] }, catalog).runs.length, 1);
  assert.throws(() => validateRuns({ runs: [{ ...run, metricName: 'pass', taskId: 'unknown' }] }, catalog));
});
