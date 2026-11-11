import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateRuns, validateTrace, safeUrl, safeAssetPath } from '../src/data.js';
import { validateImportedCatalog } from '../src/catalog-store.js';

const root = resolve(import.meta.dirname, '..');
const readJson = async (file) => JSON.parse(await readFile(resolve(root, 'public/content', file), 'utf8'));
const catalog = validateImportedCatalog(await readJson('catalog.json'));
const runs = validateRuns(await readJson('runs.json'), catalog).runs;
const profile = await readJson('profile.json');
if (!profile.name || !profile.nameZh || !Array.isArray(profile.biography)) throw new Error('个人资料缺少必要字段。');
for (const link of [...profile.links, ...profile.resources, ...catalog.tasks.flatMap((task) => task.sources)]) {
  if (!safeUrl(link.url)) throw new Error(`不安全或无效链接：${link.label || link.title}`);
}
if (profile.portrait) {
  if (!safeAssetPath(profile.portrait)) throw new Error('头像须放在 public/images/ 下并使用相对路径。');
  await access(resolve(root, 'public', profile.portrait));
}
for (const run of runs) {
  if (run.tracePath) {
    const trace = validateTrace(JSON.parse(await readFile(resolve(root, 'public', run.tracePath), 'utf8')), run.taskId);
    if (trace.runId !== run.id || trace.isExample) throw new Error(`运行 ${run.id} 的 trace 不一致或为示例。`);
  }
}
const example = await readJson('trace-example.json');
validateTrace(example, example.taskId);
if (!example.isExample) throw new Error('版式示例必须标记 isExample。');
console.log(`内容校验通过：${catalog.modules.length} 个方向，${catalog.tasks.length} 个题目条目，${runs.length} 条正式运行。`);
