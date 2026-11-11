import { tracks, ALL_TRACKS, normalizeCatalog, resolveModule, trackFilter } from './taxonomy.js';
export { tracks, ALL_TRACKS, trackDefinitions, resolveModule, trackFilter } from './taxonomy.js';
export const eventTypes = { task: '任务', tool: '工具调用', observation: '环境反馈', verifier: '评测', assistant: 'Agent 输出' };

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function safeAssetPath(value) {
  return typeof value === 'string' && /^(?:content|images)\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') && !value.includes('//');
}

export function taskHref(task, tab = 'overview', track = ALL_TRACKS) {
  const direction = trackFilter(track);
  return `#/benchmarks?module=${encodeURIComponent(resolveModule(task.module))}&task=${encodeURIComponent(task.id)}&tab=${encodeURIComponent(tab)}${direction === ALL_TRACKS ? '' : `&track=${encodeURIComponent(direction)}`}`;
}

export function validateCatalog(data) {
  if (!Array.isArray(data?.modules) || !Array.isArray(data?.tasks)) throw new Error('题库需要 modules 和 tasks 数组。');
  const modules = new Set();
  const ids = new Set();
  for (const module of data.modules) {
    if (!module.id || modules.has(module.id) || !module.title || !Array.isArray(module.tags)) throw new Error('研究方向缺少字段或 ID 重复。');
    modules.add(module.id);
  }
  for (const task of data.tasks) {
    if (!task.id || ids.has(task.id)) throw new Error('题目 ID 为空或重复。');
    if (!modules.has(task.module)) throw new Error(`题目 ${task.id} 的方向不存在。`);
    if (!['draft', 'published', 'archived'].includes(task.status)) throw new Error(`题目 ${task.id} 的状态无效。`);
    if (!tracks.includes(task.track)) throw new Error(`题目 ${task.id} 的题型无效。`);
    for (const key of ['title', 'english', 'summary', 'prompt', 'objective', 'explanation', 'caveat']) {
      if (typeof task[key] !== 'string') throw new Error(`题目 ${task.id} 缺少 ${key}。`);
    }
    for (const key of ['inputs', 'deliverables', 'criteria', 'steps', 'tools', 'sources']) {
      if (!Array.isArray(task[key])) throw new Error(`题目 ${task.id} 缺少 ${key} 数组。`);
    }
    ids.add(task.id);
  }
  return data;
}

export function validateRuns(data, catalog) {
  if (!Array.isArray(data?.runs)) throw new Error('运行数据需要 runs 数组。');
  const ids = new Set();
  for (const run of data.runs) {
    if (!run.id || ids.has(run.id) || !catalog.tasks.some((t) => t.id === run.taskId)) throw new Error('运行 ID 重复或关联题目不存在。');
    if (!['passed', 'failed', 'error', 'completed'].includes(run.status)) throw new Error('运行状态无效。');
    if (run.score != null && !Number.isFinite(run.score)) throw new Error('分数必须是有限数值或 null。');
    if (run.score != null && !run.metricName) throw new Error('有分数的运行必须说明原生指标 metricName。');
    if (!run.agent || !run.model) throw new Error('运行记录需要 agent 和 model。');
    for (const field of ['durationSeconds', 'tokens']) {
      if (run[field] != null && (!Number.isFinite(run[field]) || run[field] < 0)) throw new Error(`${field} 必须是非负有限数值或 null。`);
    }
    if (run.tracePath && (!safeAssetPath(run.tracePath) || !run.tracePath.startsWith('content/') || !run.tracePath.endsWith('.json'))) throw new Error('tracePath 必须是 content/ 下的相对 JSON 路径。');
    ids.add(run.id);
  }
  return data;
}

export function validateTrace(data, taskId) {
  if (!data || data.schemaVersion !== '1.0') throw new Error('请选择 schemaVersion 为 1.0 的展示格式 JSON。其他格式的原始运行记录需先转换。');
  if (data.taskId !== taskId) throw new Error(`记录属于 ${data.taskId || '未知题目'}，与当前题目 ${taskId} 不一致。`);
  if (typeof data.runId !== 'string' || !data.runId.trim() || data.runId.length > 160) throw new Error('缺少有效 runId。');
  if (!Array.isArray(data.events) || data.events.length > 1000) throw new Error('events 必须是数组，最多 1000 条。');
  const ids = new Set();
  const events = data.events.map((event) => {
    if (!event || !eventTypes[event.type] || typeof event.id !== 'string' || ids.has(event.id)) throw new Error('事件 ID 重复、类型无效或字段缺失。');
    for (const key of ['id', 'title', 'content']) {
      if (typeof event[key] !== 'string' || event[key].length > 20000) throw new Error('事件内容必须是文本，单字段不超过 20,000 字符。');
    }
    ids.add(event.id);
    return { id: event.id, type: event.type, title: event.title, time: typeof event.time === 'string' ? event.time.slice(0, 120) : '', content: event.content };
  });
  return { schemaVersion: '1.0', taskId, runId: data.runId, isExample: data.isExample === true, events };
}

export function matchingTasks(catalog, { query = '', moduleId = '', track = ALL_TRACKS } = {}) {
  const needle = query.trim().toLowerCase();
  const direction = trackFilter(track);
  const domain = resolveModule(moduleId);
  return catalog.tasks.filter((task) => {
    const module = catalog.modules.find((item) => item.id === task.module);
    const haystack = [task.id, task.title, task.english, task.summary, ...task.tools, module?.title, module?.english, module?.description, ...(module?.tags || [])].join(' ').toLowerCase();
    return (!domain || task.module === domain) && (direction === ALL_TRACKS || task.track === direction) && (!needle || haystack.includes(needle));
  });
}

export function matchingModules(catalog, state = {}) {
  const matches = new Set(matchingTasks(catalog, state).map((task) => task.module));
  const needle = (state.query || '').trim().toLowerCase();
  return catalog.modules.filter((module) => matches.has(module.id) || (
    trackFilter(state.track) === ALL_TRACKS &&
    (!state.moduleId || resolveModule(state.moduleId) === module.id) &&
    [module.title, module.english, module.description, ...module.tags].join(' ').toLowerCase().includes(needle)
  ));
}

export async function loadContent(path) {
  const response = await fetch(`${import.meta.env?.BASE_URL || './'}content/${path}`, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
  const data = await response.json();
  return path === 'catalog.json' ? normalizeCatalog(data) : data;
}
