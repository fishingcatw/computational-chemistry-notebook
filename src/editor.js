import { escapeHtml as e, tracks, taskHref } from './data.js';
import { icon } from './icons.js';
import { freshState, saveTask, validateEditableTask, importCatalog, restoreCatalog, localBackup, MAX_CATALOG_BYTES } from './catalog-store.js';

const labels = { draft: '草稿', published: '已发布', archived: '已归档' };
const lists = ['inputs', 'deliverables', 'criteria', 'steps', 'tools'];
const texts = ['id', 'title', 'english', 'summary', 'prompt', 'objective', 'explanation', 'caveat', 'version'];

export function managementPage(catalog, workspace = {}) {
  const intro = `<div class="editor-heading"><div><div class="eyebrow">RESEARCH WORKSPACE</div><h1 class="page-title">题目管理</h1><p>无需登录。修改仅保存在此浏览器，不影响其他访客；导出 JSON 后可提交到项目中发布。</p></div><a class="inline-link" href="#/benchmarks">返回题库 ${icon('arrow')}</a></div>`;
  return `<main id="main-content" class="page management-page">${intro}
    <div class="catalog-toolbar"><span>${workspace.local ? '正在使用本地编辑版本' : '正在使用项目默认题库'}</span><button class="button primary" data-editor-action="new">＋ 新增题目</button></div>
    <div class="catalog-actions"><button class="button secondary" data-editor-action="export-catalog">${icon('download')}导出题库 JSON</button><button class="button secondary" data-editor-action="import-catalog">${icon('upload')}导入题库 JSON</button><button class="text-button" data-editor-action="restore">恢复项目题库</button></div>
    <input id="catalog-file" type="file" accept="application/json,.json" hidden/>
    <p id="catalog-error" class="input-error" role="alert"></p>
    ${workspace.warning ? `<p class="notice">${e(workspace.warning)}</p><button class="text-button" data-editor-action="backup">导出本地存储备份</button>` : ''}
    <div class="managed-tasks">${catalog.tasks.map((task) => `<article class="managed-task"><div><span class="mono">${e(task.id)}</span><span class="tag">${e(labels[task.status])}</span><h2>${e(task.title)}</h2><p>${e(catalog.modules.find((m) => m.id === task.module)?.title || '')} · ${e(task.track)}</p></div><div class="managed-actions"><a class="text-button" href="${taskHref(task)}">查看</a><button class="button secondary small" data-editor-action="edit" data-id="${e(task.id)}">编辑题目</button><button class="text-button" data-editor-action="duplicate" data-id="${e(task.id)}">复制为新题</button></div></article>`).join('')}</div></main>`;
}

function download(data, name) {
  const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formMarkup(catalog, task, original) {
  const field = (name, label, options = {}) => `<label class="editor-field ${options.wide ? 'wide' : ''}"><span>${label}${options.required ? ' <b>*</b>' : ''}</span>${options.area ? `<textarea name="${name}" rows="${options.rows || 3}" maxlength="20000" ${options.required ? 'required' : ''}>${e(task[name] || '')}</textarea>` : `<input name="${name}" value="${e(task[name] || '')}" maxlength="${name === 'id' ? 64 : name === 'version' || name === 'difficulty' ? 80 : 300}" ${options.required ? 'required' : ''} ${options.readonly ? 'readonly' : ''}/>`}${options.hint ? `<small>${options.hint}</small>` : ''}</label>`;
  const areaList = (name, label) => `<label class="editor-field"><span>${label}</span><textarea name="${name}" rows="4" maxlength="100000">${e(task[name].join('\n'))}</textarea><small>每行一项，可留空</small></label>`;
  return `<dialog id="task-editor" class="task-editor"><form id="task-editor-form"><header class="editor-dialog-heading"><div><div class="eyebrow">${original ? 'EDIT BENCHMARK' : 'NEW BENCHMARK'}</div><h2>${original ? '编辑题目' : '新增题目'}</h2></div><button type="button" class="icon-button" data-editor-action="close" aria-label="关闭编辑器">${icon('close')}</button></header><div class="editor-scroll"><p class="editor-hint">修改仅保存到此浏览器，刷新后保留。需要发布时，请导出题库并提交项目文件。必填项为编号、名称、摘要和版本。</p><fieldset class="editor-fields"><legend>基本信息</legend><div class="editor-grid">
    ${field('id', '题目编号', { required: true, readonly: !!original, hint: original ? '现有编号固定，保证结果与链接不串题。' : '唯一编号，例如 CHEM-008；保存后不可改。' })}
    <label class="editor-field"><span>领域模块</span><select name="module" aria-label="领域模块" ${original ? 'disabled' : ''}>${catalog.modules.map((m) => `<option value="${e(m.id)}" ${m.id === task.module ? 'selected' : ''}>${e(m.title)}</option>`).join('')}</select></label>
    ${field('title', '中文题目名称', { required: true, wide: true })}${field('english', '英文名称', { wide: true })}
    <label class="editor-field"><span>任务方向</span><select name="track" aria-label="任务方向">${tracks.map((track) => `<option ${track === task.track ? 'selected' : ''}>${track}</option>`).join('')}</select><small>按主要验收目标选择，与领域模块独立。</small></label>
    <label class="editor-field"><span>状态</span><select name="status">${Object.entries(labels).map(([v, label]) => `<option value="${v}" ${v === task.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    ${field('version', '版本', { required: true })}${field('difficulty', '难度', { hint: '可留空，显示“待标定”。' })}
    ${field('summary', '摘要', { required: true, area: true, wide: true })}
    <label class="editor-checkbox wide"><input type="checkbox" name="featured" ${task.featured ? 'checked' : ''}/> 在首页精选展示</label></div></fieldset>
    <fieldset class="editor-fields"><legend>题面与中文解读</legend><div class="editor-grid">
    ${field('objective', '研究目标', { area: true, wide: true })}${field('prompt', '完整题面（可中文或英文）', { area: true, rows: 6, wide: true })}${field('explanation', '中文解释 / 解题思路', { area: true, rows: 6, wide: true })}${field('caveat', '科学边界与注意事项', { area: true, wide: true })}
    ${areaList('inputs', '输入与约束')}${areaList('deliverables', '交付产物')}${areaList('criteria', '验证与评测要求')}${areaList('steps', '研究步骤')}${areaList('tools', '参考工具')}
    <label class="editor-field"><span>参考来源</span><textarea name="sources" rows="4" maxlength="10000">${e(task.sources.map((s) => `${s.label} | ${s.url}`).join('\n'))}</textarea><small>每行“名称 | https://地址”；仅允许 http / https。</small></label></div></fieldset>
    <p class="muted-note">已有运行记录的题目请复制为新题，避免改写历史题面。清理浏览器数据会删除本地修改，请定期导出题库。</p>
    <p id="editor-error" role="alert" class="input-error"></p><p id="editor-status" role="status" class="muted-note"></p>
    </div><footer class="editor-footer"><button class="text-button" type="button" data-editor-action="export">${icon('download')}导出未保存草稿</button><div><button class="button secondary" type="button" data-editor-action="close">取消</button><button class="button primary" id="editor-save" type="submit">保存到此浏览器</button></div></footer></form></dialog>`;
}

export function createEditor({ onSaved, notify }) {
  const root = document.createElement('div');
  root.id = 'editor-root';
  document.body.append(root);
  let session = null;
  let busy = false;

  function close(force = false) {
    if (busy && !force) return;
    if (!force && session?.dirty && !confirm('还有未保存的修改，确定关闭吗？可以先导出草稿。')) return;
    root.querySelector('dialog')?.close();
    root.innerHTML = '';
    session = null;
  }

  function readForm() {
    const form = new FormData(root.querySelector('form'));
    const task = structuredClone(session.task);
    for (const field of texts) task[field] = String(form.get(field) || '').trim();
    for (const field of lists) task[field] = String(form.get(field) || '').split('\n').map((x) => x.trim()).filter(Boolean);
    task.module = session.original?.module || String(form.get('module'));
    task.track = String(form.get('track'));
    task.status = String(form.get('status'));
    task.difficulty = String(form.get('difficulty') || '').trim() || null;
    task.featured = form.has('featured');
    task.sources = String(form.get('sources') || '').split('\n').filter((line) => line.trim()).map((line) => {
      const separator = line.indexOf('|');
      if (separator < 1) return { label: '', url: line.trim() };
      return { label: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() };
    });
    if (!session.original) task.slug = task.id.toLowerCase();
    return task;
  }

  async function open(id, duplicate = false) {
    if (busy || session) return;
    busy = true;
    try {
      const latest = await freshState({ strict: true });
      const source = id ? latest.catalog.tasks.find((task) => task.id === id) : null;
      if (id && !source) throw new Error('题目已不存在，请刷新题库。');
      if (source && !duplicate && latest.runs.some((run) => run.taskId === source.id)) throw new Error('题目已有评测记录，为保留历史题面，请使用“复制为新题”。');
      const original = duplicate ? null : source;
      const blank = { id: '', module: latest.catalog.modules[0]?.id || '', title: '', english: '', slug: '', summary: '', prompt: '', objective: '', explanation: '', caveat: '', version: '0.1-draft', track: '专业软件与工作流', status: 'draft', featured: false, difficulty: null, inputs: [], deliverables: [], criteria: [], steps: [], tools: [], sources: [] };
      const task = source ? { ...structuredClone(source), ...(duplicate ? { id: '', slug: '', title: `${source.title}（新版本）`, status: 'draft', featured: false } : {}) } : blank;
      session = { original: structuredClone(original), task, catalog: latest.catalog, dirty: false };
      root.innerHTML = formMarkup(latest.catalog, task, original);
      root.querySelector('dialog').addEventListener('cancel', (event) => { event.preventDefault(); close(); });
      root.querySelector('dialog').showModal();
    } catch (error) { notify(error.message); }
    finally { busy = false; }
  }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-editor-action]');
    if (!target || busy) return;
    const action = target.dataset.editorAction;
    try {
      if (action === 'new') await open();
      if (action === 'edit') await open(target.dataset.id);
      if (action === 'duplicate') await open(target.dataset.id, true);
      if (action === 'close') close();
      if (action === 'export' && session) download(readForm(), 'unsaved-task.json');
      if (action === 'export-catalog') download((await freshState({ strict: true })).catalog, 'catalog.json');
      if (action === 'backup') download(localBackup(), 'local-storage-backup.json');
      if (action === 'import-catalog') document.querySelector('#catalog-file').click();
      if (action === 'restore' && confirm('恢复项目默认题库会删除此浏览器中的编辑。请先导出备份，确定继续吗？')) {
        busy = true;
        onSaved(await restoreCatalog());
        notify('已恢复项目默认题库。');
      }
    } catch (error) { notify(error.message); }
    finally { busy = false; }
  });
  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'catalog-file' || busy) return;
    const file = event.target.files[0];
    if (!file) return;
    const errorBox = document.querySelector('#catalog-error');
    busy = true;
    try {
      if (file.size > MAX_CATALOG_BYTES) throw new Error('请选择不超过 2 MB 的题库 JSON。');
      let input;
      try { input = JSON.parse(await file.text()); } catch { throw new Error('文件不是有效的 JSON。'); }
      if (!confirm('导入会替换此浏览器的题库，不会修改服务器。已导出备份并确定继续吗？')) return;
      const result = await importCatalog(input);
      onSaved(result);
      notify('已导入到此浏览器。');
    } catch (error) { if (errorBox?.isConnected) errorBox.textContent = error.message; }
    finally { busy = false; event.target.value = ''; }
  });
  root.addEventListener('input', () => { if (session) session.dirty = true; });
  root.addEventListener('change', () => { if (session) session.dirty = true; });
  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !session) return;
    const errorBox = root.querySelector('#editor-error');
    const statusBox = root.querySelector('#editor-status');
    errorBox.textContent = '';
    try {
      const task = readForm();
      validateEditableTask(task, session.catalog);
      busy = true;
      root.querySelectorAll('input, textarea, select, button').forEach((el) => { el.disabled = true; });
      statusBox.textContent = '正在校验并保存到此浏览器…';
      const result = await saveTask(session.original, task);
      busy = false;
      close(true);
      onSaved(result, task);
      notify('已保存到此浏览器；可导出题库 JSON 用于备份和发布。');
    } catch (error) {
      errorBox.textContent = error.message;
      statusBox.textContent = '未确认保存成功；表单内容已保留。可导出草稿后刷新核对。';
      busy = false;
      root.querySelectorAll('input, textarea, select, button').forEach((el) => { el.disabled = false; });
      if (session?.original) root.querySelector('[name="module"]').disabled = true;
    }
  });
  window.addEventListener('beforeunload', (event) => { if (session?.dirty || busy) { event.preventDefault(); event.returnValue = ''; } });

}
