import { loadContent, validateCatalog, validateRuns, safeUrl } from './data.js';
import { normalizeCatalog } from './taxonomy.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const listFields = ['inputs', 'deliverables', 'criteria', 'steps', 'tools'];
const textFields = ['title', 'english', 'summary', 'prompt', 'objective', 'explanation', 'caveat'];
export const MAX_CATALOG_BYTES = 2 * 1024 * 1024;

export function storageKey() {
  const base = new URL(import.meta.env?.BASE_URL || './', location.href).pathname;
  return `research-notebook:${base}:catalog:v1`;
}

export function validateEditableTask(task, catalog) {
  if (!task || typeof task.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(task.id)) throw new Error('题目编号只允许字母、数字、短横线、下划线，最长 64 字符。');
  for (const field of textFields) {
    if (typeof task[field] !== 'string' || task[field].length > 20000) throw new Error('文本字段必须是文本，最多 20,000 字符。');
  }
  if (!task.title.trim()) throw new Error('请填写中文题目名称。');
  if (!task.summary.trim()) throw new Error('请填写题目摘要。');
  for (const field of listFields) {
    if (!Array.isArray(task[field]) || task[field].length > 100 || task[field].some((v) => typeof v !== 'string' || v.length > 4000)) throw new Error('每项列表最多 100 行，每行最多 4,000 字符。');
  }
  if (typeof task.version !== 'string' || !task.version.trim() || task.version.length > 80) throw new Error('请填写有效版本（最长 80 字符）。');
  if (task.difficulty !== null && (typeof task.difficulty !== 'string' || task.difficulty.length > 80)) throw new Error('难度最多 80 字符。');
  if (typeof task.featured !== 'boolean') throw new Error('featured 必须是布尔值。');
  if (!Array.isArray(task.sources) || task.sources.length > 30 || task.sources.some((s) => !s || typeof s.label !== 'string' || !s.label.trim() || s.label.length > 200 || !safeUrl(s.url))) throw new Error('来源链接格式错误；请按“名称 | https://地址”逐行填写（最多 30 行）。');
  validateCatalog({ ...catalog, tasks: [...catalog.tasks.filter((t) => t.id !== task.id), task] });
  return task;
}

export function validateImportedCatalog(input) {
  const catalog = normalizeCatalog(input);
  validateCatalog(catalog);
  if (catalog.tasks.length > 1000 || !catalog.modules.length || catalog.modules.length > 50) throw new Error('题库须包含 1–50 个领域、最多 1000 道题。');
  for (const module of catalog.modules) {
    if (typeof module.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(module.id)) throw new Error('领域编号无效。');
    for (const field of ['title', 'english', 'description', 'number', 'icon']) {
      if (typeof module[field] !== 'string' || module[field].length > 4000) throw new Error(`领域缺少有效的 ${field}。`);
    }
    if (module.tags.length > 100 || module.tags.some((v) => typeof v !== 'string' || v.length > 200)) throw new Error('领域标签格式无效。');
  }
  for (const task of catalog.tasks) validateEditableTask(task, catalog);
  if (new TextEncoder().encode(JSON.stringify(catalog)).length > MAX_CATALOG_BYTES) throw new Error('题库最多 2 MB，请减少不必要的长文本。');
  return catalog;
}

export function mergeTask(latest, runs, original, task) {
  validateEditableTask(task, latest);
  const current = latest.tasks.find((t) => t.id === task.id);
  if (original) {
    if (task.id !== original.id || task.module !== original.module) throw new Error('现有题目的编号和领域不能直接变更；请复制为新题。');
    if (!current || !same(current, original)) throw new Error('该题已在其他标签页更新。请导出当前草稿，关闭后重新打开最新题目。');
    if (runs.some((r) => r.taskId === original.id) && !same(original, task)) throw new Error('这道题已有评测记录，不能改写历史题面。请复制为新题并使用新编号。');
  } else if (current) throw new Error('题目编号已存在，请换一个编号。');
  const tasks = original ? latest.tasks.map((t) => t.id === task.id ? task : t) : [...latest.tasks, task];
  const next = { ...latest, updatedAt: new Date().toISOString(), revision: crypto.randomUUID(), tasks };
  validateImportedCatalog(next);
  validateRuns({ runs }, next);
  return next;
}

function readLocal() {
  let raw;
  try { raw = localStorage.getItem(storageKey()); }
  catch { throw new Error('浏览器禁用了本地存储；你仍可浏览项目题库，编辑前请允许此站点存储数据。'); }
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (record.schemaVersion !== '1.0') throw new Error('schema');
    return { ...record, catalog: validateImportedCatalog(record.catalog) };
  } catch {
    throw new Error('本地题库损坏，原始数据未删除。请在题目管理中导出备份，再恢复项目题库或导入有效 JSON。');
  }
}

export async function freshState({ strict = false } = {}) {
  const [base, runData] = await Promise.all([loadContent('catalog.json'), loadContent('runs.json')]);
  validateImportedCatalog(base);
  validateRuns(runData, base);
  try {
    const local = readLocal();
    const catalog = local?.catalog || base;
    validateRuns(runData, catalog);
    const warning = local && local.base !== JSON.stringify(base) ? '项目默认题库已更新；当前保留本地版本，请导出备份后合并，或恢复项目题库。' : '';
    return { catalog, runs: runData.runs, base, local: !!local, warning };
  } catch (error) {
    if (strict) throw error;
    return { catalog: base, runs: runData.runs, base, local: false, warning: error.message };
  }
}

function writeLocal(catalog, base) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ schemaVersion: '1.0', base: JSON.stringify(base), catalog }));
  } catch {
    throw new Error('无法保存：本地存储已满或被浏览器禁用。修改仍在表单中，请先导出草稿。');
  }
}

function withLock(action) {
  return navigator.locks ? navigator.locks.request(storageKey(), action) : action();
}

export async function saveTask(original, task) {
  return withLock(async () => {
    const current = await freshState({ strict: true });
    const latest = readLocal()?.catalog || current.base;
    const catalog = mergeTask(latest, current.runs, original, task);
    writeLocal(catalog, current.base);
    return { ...current, catalog, local: true, warning: '' };
  });
}

export async function importCatalog(input) {
  const imported = validateImportedCatalog(input);
  return withLock(async () => {
    const current = await freshState();
    validateRuns({ runs: current.runs }, imported);
    for (const run of current.runs) {
      const original = current.catalog.tasks.find((task) => task.id === run.taskId);
      const replacement = imported.tasks.find((task) => task.id === run.taskId);
      if (!same(original, replacement)) throw new Error('导入会改写已有评测记录对应的题面，已拒绝；请保留历史题目。');
    }
    const catalog = { ...imported, revision: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    writeLocal(catalog, current.base);
    return { ...current, catalog, local: true, warning: '' };
  });
}

export async function restoreCatalog() {
  return withLock(async () => {
    const current = await freshState();
    try { localStorage.removeItem(storageKey()); }
    catch { throw new Error('浏览器禁止修改本地存储，无法恢复。'); }
    return { ...current, catalog: current.base, local: false, warning: '' };
  });
}

export function localBackup() {
  try { return localStorage.getItem(storageKey()) || '{}'; }
  catch { throw new Error('浏览器禁止读取本地存储。'); }
}
