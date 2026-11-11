import './styles.css';
import './prism.css';
import './editor.css';
import { createEditor, managementPage } from './editor.js';
import { loadContent, validateTrace, matchingModules, matchingTasks, ALL_TRACKS, resolveModule, trackFilter, taskHref, escapeHtml as e } from './data.js';
import { freshState, storageKey } from './catalog-store.js';
import { header, footer, aboutPage, mapPage, mapCards, benchmarkPage, taskList, maintenanceDialog } from './pages.js';

const app = document.querySelector('#app');
let profile;
let catalog;
let runs;
let currentPage = '';
let currentTask = '';
let toastTimer;
let traceRequest = 0;
const state = { query: '', track: ALL_TRACKS, taskQuery: '', trace: null, traceFilter: 'all', traceFormat: 'timeline', traceOrigin: '', moduleId: '', tab: 'overview', task: null };

let workspace = { local: false, warning: '' };
createEditor({
  notify,
  onSaved: (result, task) => {
    workspace = result;
    catalog = result.catalog;
    runs = result.runs;
    state.trace = null;
    traceRequest += 1;
    location.hash = task ? taskHref(task).slice(1) : '/manage';
    render();
  },
});

function route() {
  const [path = '/about', search = ''] = location.hash.slice(1).split('?');
  const page = path.replace(/^\//, '') || 'about';
  return { page, params: new URLSearchParams(search) };
}

function render() {
  const { page, params } = route();
  const scrollY = document.querySelector('.site-surface')?.scrollTop || 0;
  let content;
  if (page === 'map') {
    state.moduleId = '';
    state.query = params.get('q') || '';
    state.track = trackFilter(params.get('track'));
    content = mapPage(catalog, runs, state);
    document.title = '题目地图 · Yanqing Fang';
  } else if (page === 'benchmarks') {
    state.moduleId = resolveModule(params.get('module') || '');
    state.track = trackFilter(params.get('track'));
    const requestedTask = params.get('task');
    const moduleExists = !state.moduleId || catalog.modules.some((m) => m.id === state.moduleId);
    const candidates = matchingTasks(catalog, { moduleId: state.moduleId, track: state.track });
    state.task = moduleExists ? (requestedTask ? candidates.find((task) => task.id === requestedTask) : candidates[0]) : undefined;
    state.tab = ['overview', 'explanation', 'results', 'traces'].includes(params.get('tab')) ? params.get('tab') : 'overview';
    if (currentTask !== state.task?.id) {
      state.trace = null;
      state.traceFilter = 'all';
      state.traceFormat = 'timeline';
      state.traceOrigin = '';
      state.taskQuery = '';
      traceRequest += 1;
    }
    content = benchmarkPage(catalog, runs, state);
    document.title = `${state.task?.title || '题目未找到'} · Yanqing Fang`;
  } else if (page === 'manage') {
    content = managementPage(catalog, workspace);
    document.title = '题目管理 · Yanqing Fang';
  } else if (page === 'about') {
    content = aboutPage(profile, catalog, runs);
    document.title = 'Yanqing Fang · Computational Research';
  } else {
    content = '<main id="main-content" class="page not-found"><div class="eyebrow">404 / NOTE NOT FOUND</div><h1 class="page-title">这一页还没有写下。</h1><p>请回到研究档案继续浏览。</p><a class="button primary" href="#/about">返回 About</a></main>';
  }
  app.innerHTML = `<div class="site-surface">${header(profile, page)}${content}${footer(profile)}</div>${maintenanceDialog()}`;
  const surface = document.querySelector('.site-surface');
  surface.scrollTop = currentPage !== page || (page === 'benchmarks' && currentTask !== state.task?.id) ? 0 : scrollY;
  currentPage = page;
  currentTask = state.task?.id || '';
}

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

function refreshMap() {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.track !== ALL_TRACKS) params.set('track', state.track);
  history.replaceState(null, '', `#/map${params.size ? `?${params}` : ''}`);
  document.querySelector('#module-grid').innerHTML = mapCards(catalog, state);
  document.querySelector('#map-count').textContent = `${matchingModules(catalog, state).length} 个领域 · ${matchingTasks(catalog, state).length} 个匹配题目`;
  document.querySelectorAll('[data-action="map-track"]').forEach((button) => {
    const active = button.dataset.value === state.track;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function showTrace(data, origin) {
  state.trace = data;
  state.traceOrigin = origin;
  state.traceFilter = 'all';
  state.traceFormat = 'timeline';
  render();
}

async function getDemo() {
  const taskId = state.task.id;
  const token = ++traceRequest;
  const data = await loadContent('trace-example.json');
  if (token !== traceRequest || state.task?.id !== taskId || route().page !== 'benchmarks') return;
  showTrace(validateTrace({ ...data, taskId, isExample: true }, taskId), 'example');
}

async function loadRun(id) {
  const run = runs.find((r) => r.id === id && r.taskId === state.task?.id);
  if (!run?.tracePath) return;
  const taskId = state.task.id;
  const token = ++traceRequest;
  const response = await fetch(import.meta.env.BASE_URL + run.tracePath);
  if (!response.ok) throw new Error('运行记录暂时无法读取。');
  const data = validateTrace(await response.json(), taskId);
  if (token !== traceRequest || state.task?.id !== taskId || route().page !== 'benchmarks') return;
  if (data.runId !== run.id || data.isExample) throw new Error('Trace 与运行记录 ID 不一致，或仍被标记为示例。');
  state.trace = data;
  state.traceOrigin = 'published';
  state.traceFilter = 'all';
  state.traceFormat = 'timeline';
  const target = taskHref(state.task, 'traces', state.track);
  if (location.hash === target) render();
  else location.hash = target.slice(1);
}

async function importTrace(file) {
  if (!file) return;
  const taskId = state.task.id;
  const token = ++traceRequest;
  const errorBox = document.querySelector('#trace-error');
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('请选择不超过 2 MB 的脱敏 JSON。');
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('文件不是有效 JSON，请先使用格式模板整理记录。'); }
    data = validateTrace(data, taskId);
    if (token !== traceRequest || taskId !== state.task?.id || route().page !== 'benchmarks') return;
    showTrace(data, 'local');
    notify('已在本机载入；没有上传或保存到网站。');
  } catch (error) {
    if (errorBox?.isConnected) errorBox.textContent = error.message;
  }
}

async function downloadTemplate() {
  const taskId = state.task.id;
  const data = await loadContent('trace-example.json');
  const blob = new Blob([JSON.stringify({ ...data, taskId }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${taskId}-trace-template.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

app.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  try {
    switch (button.dataset.action) {
      case 'theme': {
        const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem('yf-theme', theme); } catch { /* Storage is optional. */ }
        const input = document.activeElement;
        const selection = input?.selectionStart;
        const id = input?.id;
        render();
        if (id) { document.getElementById(id)?.focus(); if (selection != null) document.getElementById(id)?.setSelectionRange?.(selection, selection); }
        document.querySelector('[data-action="theme"]').focus();
        break;
      }
      case 'like': {
        const liked = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(liked));
        button.classList.toggle('liked', liked);
        button.querySelector('span').textContent = liked ? 'Liked' : 'Like';
        try { localStorage.setItem('yf-liked', String(liked)); } catch { notify('浏览器禁止存储，收藏仅在本次页面有效。'); }
        break;
      }
      case 'maintenance': document.querySelector('#maintenance-dialog').showModal(); break;
      case 'close-dialog': document.querySelector('#maintenance-dialog').close(); break;
      case 'map-track': state.track = trackFilter(button.dataset.value); refreshMap(); break;
      case 'reset-map':
        state.query = ''; state.track = ALL_TRACKS;
        document.querySelector('#map-search').value = '';
        refreshMap();
        document.querySelector('#map-search').focus();
        break;
      case 'copy-link':
        if (!navigator.clipboard) throw new Error('浏览器不支持自动复制，请复制地址栏链接。');
        await navigator.clipboard.writeText(location.href);
        notify('题目链接已复制。');
        break;
      case 'show-demo': await getDemo(); break;
      case 'import-trace': document.querySelector('#trace-file').click(); break;
      case 'clear-trace': state.trace = null; traceRequest += 1; render(); break;
      case 'trace-filter': state.traceFilter = button.dataset.value; render(); break;
      case 'trace-format': state.traceFormat = state.traceFormat === 'json' ? 'timeline' : 'json'; render(); break;
      case 'download-template': await downloadTemplate(); break;
      case 'load-run': await loadRun(button.dataset.run); break;
    }
  } catch (error) { notify(error.message || '操作未完成，请重试。'); }
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'map-search') { state.query = event.target.value; refreshMap(); }
  if (event.target.id === 'task-search') {
    state.taskQuery = event.target.value;
    document.querySelector('#task-list').innerHTML = taskList(catalog, state.moduleId, state.task?.id, state.taskQuery, state.track);
  }
});

app.addEventListener('change', (event) => {
  if (['task-module', 'task-track'].includes(event.target.id)) {
    state.taskQuery = '';
    const params = new URLSearchParams();
    const moduleId = document.querySelector('#task-module').value;
    const direction = document.querySelector('#task-track').value;
    if (moduleId) params.set('module', moduleId);
    if (direction !== ALL_TRACKS) params.set('track', direction);
    location.hash = `/benchmarks${params.size ? `?${params}` : ''}`;
  }
  if (event.target.id === 'trace-file') void importTrace(event.target.files[0]);
});

document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  const main = document.querySelector('#main-content');
  if (!main) return;
  main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: 'start' });
});

window.addEventListener('hashchange', () => { if (catalog) render(); });
window.addEventListener('storage', async (event) => {
  if (!catalog || (event.key !== storageKey() && event.key !== null)) return;
  try {
    workspace = await freshState();
    catalog = workspace.catalog;
    runs = workspace.runs;
    state.trace = null;
    traceRequest += 1;
    render();
  } catch (error) { notify(error.message); }
});

async function init() {
  try {
    const [profileData, workspaceData] = await Promise.all([loadContent('profile.json'), freshState()]);
    profile = profileData;
    workspace = workspaceData;
    catalog = workspace.catalog;
    runs = workspace.runs;
    if (!location.hash) history.replaceState(null, '', '#/about');
    render();
    if (workspace.warning) notify(workspace.warning);
  } catch (error) {
    app.innerHTML = `<main class="page not-found"><h1 class="page-title">研究档案暂时无法打开</h1><p>${e(error.message)}</p><p>请确认内容文件格式正确，并通过 HTTP 服务访问本站。</p><button class="button primary" id="reload">重新载入</button></main>`;
    document.querySelector('#reload').addEventListener('click', () => location.reload());
  }
}
void init();
