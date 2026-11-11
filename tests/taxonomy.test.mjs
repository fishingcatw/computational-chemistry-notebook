import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { domainDefinitions, trackDefinitions, normalizeCatalog, resolveModule, trackFilter, TAXONOMY_VERSION, ALL_TRACKS } from '../src/taxonomy.js';
import { validateCatalog, validateRuns, matchingTasks, matchingModules, taskHref } from '../src/data.js';
import { mergeTask } from '../src/catalog-store.js';
import { legacyCatalog } from './fixtures/legacy-catalog.mjs';

const seed = JSON.parse(await readFile(new URL('../public/content/catalog.json', import.meta.url)));

test('local taxonomy matches the five exact domains and three task directions', () => {
  assert.deepEqual(seed.modules, domainDefinitions);
  assert.deepEqual(seed.taskDirections, trackDefinitions);
  assert.equal(seed.taxonomyVersion, TAXONOMY_VERSION);
});

test('migration is pure and idempotent; preserves added tasks, unknown fields and existing runs', () => {
  const raw = legacyCatalog(seed);
  raw.customMetadata = { ownerNotes: 'keep this' };
  raw.tasks[0].prompt = 'A user-edited prompt that must not be replaced.';
  raw.tasks.push({ ...raw.tasks[0], id: 'CUSTOM-008', module: 'surfaces', customAttachment: 'content/custom.json' });
  const snapshot = structuredClone(raw);
  const runs = { runs: [{ id: 'run-old', taskId: 'MAT-001', status: 'passed', agent: 'Fixture', model: 'Fixture', score: 1, metricName: 'pass' }] };
  const next = normalizeCatalog(raw);
  validateCatalog(next);
  validateRuns(runs, next);
  assert.deepEqual(raw, snapshot);
  assert.deepEqual(normalizeCatalog(next), next);
  assert.equal(next.tasks.length, raw.tasks.length);
  const withoutClassification = ({ module, track, ...rest }) => rest;
  assert.deepEqual(next.tasks.map(withoutClassification), raw.tasks.map(withoutClassification));
  assert.deepEqual(next.customMetadata, raw.customMetadata);
  assert.equal(next.tasks.find((task) => task.id === 'CUSTOM-008').module, 'materials');
  assert.equal(runs.runs[0].taskId, 'MAT-001');
  assert.equal(next.tasks.find((task) => task.id === 'MAT-001').module, 'materials');
});

test('legacy links resolve while truly unknown domains remain unknown', () => {
  for (const id of ['electronic', 'stability', 'surfaces']) assert.equal(resolveModule(id), 'materials');
  assert.equal(resolveModule('unknown'), 'unknown');
  assert.equal(trackFilter('工作流'), '专业软件与工作流');
  assert.equal(trackFilter('改进优化'), '开放研究与优化');
  assert.equal(trackFilter('逆向研究'), '前沿求解');
  assert.equal(trackFilter('全部题型'), ALL_TRACKS);
  assert.match(taskHref({ id: 'MAT-001', module: 'electronic' }), /module=materials/);
});

test('direction and keyword filter identify the same matching task and domain', () => {
  const state = { moduleId: 'materials', track: '前沿求解', query: '状态方程' };
  assert.deepEqual(matchingTasks(seed, state).map((task) => task.id), ['MAT-002']);
  assert.deepEqual(matchingModules(seed, state).map((module) => module.id), ['materials']);
  assert.equal(matchingTasks(seed, { moduleId: 'materials', track: '专业软件与工作流' })[0].id, 'MAT-001');
});

test('unrecognized migration inputs fail closed and legacy editing uses canonical values', () => {
  const invalid = legacyCatalog(seed);
  invalid.modules.push({ id: 'unexpected', title: 'Must review', tags: [] });
  assert.throws(() => normalizeCatalog(invalid), /未定义迁移映射/);
  const current = normalizeCatalog(legacyCatalog(seed));
  const original = current.tasks.find((task) => task.id === 'MAT-001');
  const changed = { ...original, title: 'New title' };
  const next = mergeTask(current, [], original, changed);
  assert.equal(next.tasks.find((task) => task.id === 'MAT-001').track, '专业软件与工作流');
  assert.equal(next.tasks.find((task) => task.id === 'MAT-001').module, 'materials');
});
