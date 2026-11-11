import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeTask, validateEditableTask, validateImportedCatalog } from '../src/catalog-store.js';
const catalog = JSON.parse(await readFile(new URL('../public/content/catalog.json', import.meta.url)));
const task = catalog.tasks[0];

test('create preserves all existing tasks and metadata', () => {
  const next = mergeTask(catalog, [], null, { ...task, id: 'TEST-NEW' });
  assert.equal(next.tasks.length, catalog.tasks.length + 1);
  assert.deepEqual(next.tasks.slice(0, -1), catalog.tasks);
  assert.deepEqual(next.modules, catalog.modules);
  assert.ok(next.revision);
});
test('edit preserves other task updates while rejecting same-task conflicts', () => {
  const latest = structuredClone(catalog);
  latest.tasks[1].title = 'Concurrent unrelated title';
  const changed = { ...task, title: 'Edited title' };
  const next = mergeTask(latest, [], task, changed);
  assert.equal(next.tasks[1].title, 'Concurrent unrelated title');
  assert.equal(next.tasks[0].title, changed.title);
  latest.tasks[0].summary = 'Concurrent same-task edit';
  assert.throws(() => mergeTask(latest, [], task, changed), /其他标签页更新/);
});
test('reject duplicate IDs, renames and edits to historical scored tasks', () => {
  assert.throws(() => mergeTask(catalog, [], null, task), /已存在/);
  assert.throws(() => mergeTask(catalog, [], task, { ...task, id: 'OTHER' }), /不能直接变更/);
  assert.throws(() => mergeTask(catalog, [{ taskId: task.id }], task, { ...task, title: 'Changed' }), /已有评测/);
});
test('editor bounds text, rejects unsafe sources and malformed IDs', () => {
  assert.throws(() => validateEditableTask({ ...task, id: '../secret' }, catalog));
  assert.throws(() => validateEditableTask({ ...task, sources: [{ label: 'source', url: 'javascript:alert(1)' }] }, catalog));
  assert.throws(() => validateEditableTask({ ...task, title: '' }, catalog));
  assert.throws(() => validateEditableTask({ ...task, explanation: 'x'.repeat(20001) }, catalog));
  assert.throws(() => validateEditableTask({ ...task, criteria: [null] }, catalog));
});
test('imported catalogs validate every nested field without modifying the input', () => {
  assert.deepEqual(validateImportedCatalog(catalog), catalog);
  const invalid = structuredClone(catalog);
  invalid.modules[0].tags = [null];
  assert.throws(() => validateImportedCatalog(invalid), /标签格式/);
  const duplicate = structuredClone(catalog);
  duplicate.tasks.push(duplicate.tasks[0]);
  assert.throws(() => validateImportedCatalog(duplicate), /重复/);
});
