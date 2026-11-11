import { icon, illustration } from './icons.js';
import { escapeHtml as e, safeUrl, safeAssetPath, taskHref, tracks, ALL_TRACKS, trackDefinitions, matchingModules, matchingTasks, eventTypes } from './data.js';

const statusLabels = { draft: '草稿示例', published: '已发布', archived: '已归档' };
const runLabels = { passed: '通过', failed: '未通过', error: '运行异常', completed: '运行完成' };
export const tag = (text, className = '') => `<span class="tag ${className}">${e(text)}</span>`;
const external = (url, label, className = '') => safeUrl(url) ? `<a class="${className}" href="${e(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}${icon('external')}</a>` : `<span>${label}</span>`;
const bulletList = (items) => `<ul class="content-list">${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`;
const sectionTitle = (number, title, aside = '') => `<div class="section-heading"><h2><span class="section-number">${number}</span>${title}</h2>${aside}</div>`;

export function header(profile, page) {
  return `<header class="site-header"><div class="header-inner"><a class="wordmark" href="#/about">${e(profile.name)}</a><div class="header-right"><nav class="main-nav" aria-label="主导航"><a href="#/about" ${page === 'about' ? 'aria-current="page"' : ''}>About</a><a href="#/map" ${page === 'map' ? 'aria-current="page"' : ''}>题目地图</a><a href="#/benchmarks" ${page === 'benchmarks' ? 'aria-current="page"' : ''}>Benchmarks</a><a href="#/manage" ${page === 'manage' ? 'aria-current="page"' : ''}>题目管理</a></nav><span class="nav-divider"></span><button class="icon-button theme-toggle" data-action="theme" aria-label="切换深浅色主题" title="切换深浅色主题">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'monitor')}</button></div></div></header>`;
}

export function footer(profile) {
  return `<footer class="site-footer"><div><span class="footer-name">${e(profile.name)}</span><span class="footer-dot">/</span><span>Research, with evidence.</span></div><div class="footer-right"><span>© ${new Date().getFullYear()}</span><button class="text-button" data-action="maintenance">内容维护</button>${external('https://github.com/xyjoey/PRISM', 'Inspired by PRISM', 'footer-credit')}</div></footer>`;
}

function profileSidebar(profile) {
  const portrait = profile.portrait && safeAssetPath(profile.portrait)
    ? `<img class="portrait-photo" src="${e(import.meta.env.BASE_URL + profile.portrait)}" alt="${e(profile.portraitAlt || `${profile.name} 的头像`)}" title="${e(profile.portraitAlt || profile.name)}" width="224" height="224"/>`
    : '<div class="portrait-monogram" role="img" aria-label="个人头像待补充"><span class="monogram">YF</span></div>';
  let liked = false;
  try { liked = localStorage.getItem('yf-liked') === 'true'; } catch { /* Storage is optional. */ }
  return `<aside class="profile-sidebar">
    ${portrait}
    <div class="profile-identity"><h1 title="${e(profile.nameZh)}">${e(profile.name)}</h1><p class="profile-focus">${e(profile.focus)}</p><p class="profile-tagline">${e(profile.affiliation || profile.tagline)}</p></div>
    <section class="research-interests"><h2>Research Interests</h2>${profile.interests.map((interest) => `<p>${e(interest)}</p>`).join('')}</section>
    <div class="profile-like"><button class="like-button ${liked ? 'liked' : ''}" data-action="like" aria-pressed="${liked}" aria-label="收藏本站（仅保存在此浏览器）" title="仅在此浏览器保存，不是访客统计">${icon('heart')}<span>${liked ? 'Liked' : 'Like'}</span></button></div>
  </aside>`;
}

export function aboutPage(profile, catalog, runs) {
  const featured = catalog.tasks.filter((t) => t.featured);
  return `<main id="main-content" class="page about-layout">
    <div>${profileSidebar(profile)}</div>
    <div class="about-main">
      <section class="about-intro"><h2 class="page-title">About</h2>${profile.biography.map((p) => `<p class="body-copy">${e(p)}</p>`).join('')}</section>
      <section class="about-collection">
        <div class="section-heading"><h2>Selected Benchmarks</h2><a href="#/map" class="inline-link" aria-label="探索题目地图">View All ${icon('arrow')}</a></div>
        <div class="featured-list">${featured.map((task) => {
          const module = catalog.modules.find((m) => m.id === task.module);
          return `<a href="${taskHref(task)}" class="featured-card"><div class="featured-body">
            <h3>${e(task.english)}</h3>
            <p class="publication-byline"><span>${e(profile.name)}</span><span class="publication-status">${e(statusLabels[task.status])}</span></p>
            <p class="publication-venue">${e(module.title)} · ${e(task.track)}</p>
            <p class="publication-abstract">${e(task.title)}。${e(task.summary)}</p>
          </div></a>`;
        }).join('')}</div>
        <p class="collection-summary">${catalog.modules.length} 个领域模块 · ${catalog.tasks.filter((t) => t.status === 'published').length} 个正式题目 · ${runs.length} 条运行记录。草稿不计入正式评测。</p>
      </section>
      <section class="news-section"><div class="section-heading"><h2>News</h2></div><div class="news-list">${profile.updates.map((item) => `<div class="news-item"><time>${e(item.date)}</time><p>${e(item.text)}</p></div>`).join('')}</div></section>
      <section class="resources-section"><div class="section-heading"><h2>Research Resources</h2></div><div class="resource-grid">${profile.resources.map((item) => external(item.url, `<span><strong>${e(item.title)}</strong><small>${e(item.description)}</small></span>`, 'resource-link')).join('')}</div></section>
    </div>
  </main>`;
}

export function mapCards(catalog, state) {
  const modules = matchingModules(catalog, state);
  if (!modules.length) return emptyState('search', '没有找到匹配的研究方向', '试试其他关键词，或清除筛选条件。', '<button class="button secondary" data-action="reset-map">清除筛选</button>');
  return modules.map((module) => {
    const tasks = matchingTasks(catalog, { ...state, moduleId: module.id });
    const href = tasks.length ? taskHref(tasks[0], 'overview', state.track) : `#/benchmarks?module=${encodeURIComponent(module.id)}`;
    return `<a class="module-card" data-module="${e(module.id)}" href="${href}">
      <div class="module-top"><span class="module-number">${e(module.number)}</span>${illustration(module.icon)}</div>
      <h2>${e(module.title)}</h2><p class="module-english">${e(module.english)}</p>
      <p class="module-description">${e(module.description)}</p><div class="module-tags">${module.tags.map((t) => tag(t)).join('')}</div>
      <div class="module-footer"><span>${tasks.length} 个匹配题目<span class="mini-dot">·</span>${tasks.filter((t) => t.status === 'published').length} 个已发布</span><span class="module-open">浏览题目 ${icon('arrow')}</span></div>
    </a>`;
  }).join('');
}

export function mapPage(catalog, runs, state) {
  return `<main id="main-content" class="page atlas-page">
    <section class="page-heading"><h1 class="page-title">题目地图</h1><p class="page-description">五个领域模块，三个任务方向。<br/>领域回答“研究什么”，任务方向回答“如何考查”。</p></section>
    <div class="atlas-stats taxonomy-stats">
      <div><strong>${String(catalog.modules.length).padStart(2, '0')}</strong><span>领域模块</span></div>
      <div><strong>${String(tracks.length).padStart(2, '0')}</strong><span>任务方向</span></div>
      <div><strong>${String(catalog.tasks.length).padStart(2, '0')}</strong><span>题目条目</span></div>
      <div><strong>${String(runs.length).padStart(2, '0')}</strong><span>运行记录</span></div>
    </div>
    <section class="task-directions" aria-label="三个任务方向">
      <div class="section-heading"><h2>Task Directions</h2><span class="directions-note">每个领域均可覆盖三类任务</span></div>
      <div class="direction-grid">${trackDefinitions.map((direction) => `<button type="button" class="direction-card ${state.track === direction.title ? 'active' : ''}" data-action="map-track" data-value="${e(direction.title)}" aria-pressed="${state.track === direction.title}">
        <span class="direction-top"><span class="mono">${e(direction.number)}</span>${icon(direction.icon)}</span>
        <strong>${e(direction.title)}</strong><span class="direction-english">${e(direction.english)}</span><span class="direction-description">${e(direction.description)}</span>
        <span class="direction-count">${catalog.tasks.filter((task) => task.track === direction.title).length} 个题目条目 ${icon('arrow')}</span>
      </button>`).join('')}</div>
    </section>
    <section class="atlas-library" aria-label="领域模块列表">
      <div class="section-heading domain-heading"><h2>Research Domains</h2><span class="directions-note">选择领域，浏览对应题目</span></div>
      <div class="filter-top"><div class="filter-pills" role="group" aria-label="按任务方向筛选">${[ALL_TRACKS, ...tracks].map((track) => `<button data-action="map-track" data-value="${e(track)}" class="filter-pill ${track === state.track ? 'active' : ''}" aria-pressed="${track === state.track}">${e(track)}</button>`).join('')}</div>
      <label class="search-box">${icon('search')}<input id="map-search" type="search" placeholder="搜索领域、题目或关键词…" aria-label="搜索方向、题目或关键词" value="${e(state.query)}" autocomplete="off"/></label></div>
      <div class="filter-meta"><p id="map-count" aria-live="polite">${matchingModules(catalog, state).length} 个领域 · ${matchingTasks(catalog, state).length} 个匹配题目</p><span>草稿条目不计为正式评测</span></div>
      <div id="module-grid" class="module-grid">${mapCards(catalog, state)}</div>
    </section>
    <section class="atlas-method"><div><div class="eyebrow">DOMAIN × TASK DIRECTION</div><h2>同一领域，不同能力。</h2></div><p class="taxonomy-footnote">按主要验收目标选择任务方向；<br/>研究对象与能力类型分别记录。</p></section>
  </main>`;
}

export function emptyState(symbol, title, description, action = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon(symbol)}</div><h3>${e(title)}</h3><p>${e(description)}</p>${action ? `<div class="empty-actions">${action}</div>` : ''}</div>`;
}

export function taskList(catalog, moduleId, taskId, query = '', track = ALL_TRACKS) {
  const tasks = matchingTasks(catalog, { moduleId, query, track });
  return tasks.length ? tasks.map((task) => `<a class="task-list-item ${task.id === taskId ? 'selected' : ''}" href="${taskHref(task, 'overview', track)}" ${task.id === taskId ? 'aria-current="true"' : ''}><span class="mono">${e(task.id)}<span class="list-status-dot"></span></span><strong>${e(task.title)}</strong><small>${e(task.track)} · ${e(statusLabels[task.status])}</small></a>`).join('') : '<p class="small-empty">没有匹配题目。</p>';
}

export function benchmarkPage(catalog, runs, state) {
  const task = state.task;
  const module = catalog.modules.find((m) => m.id === task?.module);
  const moduleId = state.moduleId;
  const tabs = [['overview', '题目'], ['explanation', '中文解读'], ['results', '评测结果'], ['traces', 'Traces']];
  const backHref = state.track === ALL_TRACKS ? '#/map' : `#/map?track=${encodeURIComponent(state.track)}`;
  return `<main id="main-content" class="page benchmark-page">
    <div class="benchmark-heading"><a href="${backHref}" class="back-link">${icon('back')}返回题目地图</a></div>
    <div class="benchmark-layout"><aside class="task-sidebar">
      <div class="sidebar-heading"><h2>题目索引</h2><span>${catalog.tasks.length}</span></div>
      <label class="sidebar-filter"><span>领域模块</span><span class="sidebar-select"><select id="task-module" aria-label="选择领域模块"><option value="">全部领域模块</option>${catalog.modules.map((m) => `<option value="${e(m.id)}" ${m.id === moduleId ? 'selected' : ''}>${e(m.title)}</option>`).join('')}</select>${icon('down')}</span></label>
      <label class="sidebar-filter"><span>任务方向</span><span class="sidebar-select"><select id="task-track" aria-label="选择任务方向">${[ALL_TRACKS, ...tracks].map((track) => `<option ${track === state.track ? 'selected' : ''}>${e(track)}</option>`).join('')}</select>${icon('down')}</span></label>
      <label class="search-box sidebar-search">${icon('search')}<input id="task-search" type="search" aria-label="搜索题目" placeholder="搜索题目…" value="${e(state.taskQuery)}"/></label>
      <div id="task-list" class="task-list">${taskList(catalog, moduleId, task?.id, state.taskQuery, state.track)}</div>
      <div class="sidebar-footnote">${icon('info')}灰色标记为题型草稿。<br/>正式题目将在验证后发布。</div>
    </aside><article class="task-detail">${task ? `
      <div class="task-category"><span class="mono">${e(task.id)}</span><span>/</span><span>${e(module.title)}</span><button class="icon-button copy-task" data-action="copy-link" aria-label="复制当前题目链接" title="复制题目链接">${icon('copy')}</button></div>
      <h1 class="task-title">${e(task.title)}</h1><p class="task-english">${e(task.english)}</p>
      <div class="task-badges">${tag(statusLabels[task.status], task.status === 'draft' ? 'tag-draft' : '')}${tag(task.track)}<span class="version-label">${e(task.version)}</span></div><p class="task-summary">${e(task.summary)}</p>
      <div class="task-editor-tools"><button class="button small secondary" data-editor-action="edit" data-id="${e(task.id)}">编辑题目</button><button class="text-button" data-editor-action="duplicate" data-id="${e(task.id)}">复制为新题</button></div>
      <nav class="detail-tabs" aria-label="题目内容">${tabs.map(([id, label]) => `<a href="${taskHref(task, id, state.track)}" ${state.tab === id ? 'aria-current="page"' : ''}>${label}${id === 'results' ? `<span>${runs.filter((r) => r.taskId === task.id).length}</span>` : ''}</a>`).join('')}</nav>
      <div id="detail-panel" class="detail-panel">${detailPanel(task, runs, state)}</div>` : emptyState('book', '题目尚未收录', '当前领域与方向中没有匹配题目，请调整左侧筛选或浏览全部题目。', '<a class="button secondary" href="#/benchmarks">浏览全部题目</a>')}
    </article></div>
  </main>`;
}

function draftBanner(task) {
  return task.status === 'draft' ? `<div class="notice">${icon('info')}<p><strong>题型草稿 · 非正式评测题</strong><span>以下内容用于说明题目结构。数据、预算与验收阈值尚待补充，暂无实际成绩。</span></p></div>` : '';
}

function detailPanel(task, runs, state) {
  if (state.tab === 'explanation') return `${draftBanner(task)}<div class="detail-block"><div class="eyebrow">READING THE PROBLEM</div><h2>这道题在考什么？</h2><p>${e(task.explanation)}</p></div><div class="explanation-steps">${task.steps.map((step, index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><p>${e(step)}</p></div>`).join('')}</div><div class="detail-block"><h2>科学边界与常见误区</h2><div class="caveat">${e(task.caveat)}</div></div><div class="detail-block"><h2>如何验证，而非只相信回答</h2>${bulletList(task.criteria)}</div><p class="muted-note">详细中文解读、推导过程和失败分析，将随正式题目逐步完善。</p>`;
  if (state.tab === 'results') return resultsPanel(task, runs);
  if (state.tab === 'traces') return tracesPanel(task, runs, state);
  return `${draftBanner(task)}<div class="task-metadata"><div><span>任务方向</span><strong>${e(task.track)}</strong></div><div><span>难度</span><strong>${e(task.difficulty || '待标定')}</strong></div><div><span>参考工具 · 拟用</span><strong>${task.tools.map(e).join(' / ')}</strong></div></div><section class="detail-block"><div class="eyebrow">THE RESEARCH QUESTION</div><h2>研究目标</h2><p>${e(task.objective)}</p><div class="english-prompt" lang="en">${e(task.prompt)}</div></section><div class="detail-columns"><section class="detail-block"><h2>输入与约束</h2>${bulletList(task.inputs)}</section><section class="detail-block"><h2>交付产物</h2>${bulletList(task.deliverables)}</section></div><section class="detail-block"><h2>验证与评测</h2>${bulletList(task.criteria)}<p class="muted-note">独立验证器检查可执行产物与科学条件；运行完成不等于评测通过。</p></section><section class="detail-block"><h2>资料与附件</h2>${task.sources.length ? `<div class="source-links">${task.sources.map((source) => external(source.url, `${icon('book')}<span>${e(source.label)}</span>`, 'source-link')).join('')}</div>` : '<p class="muted-note">论文与数据来源待补充。</p>'}<div class="attachment-placeholder">${icon('file')}<span>题目包、输入数据与配置文件</span>${tag('待发布')}</div></section>`;
}

function resultsPanel(task, runs) {
  const taskRuns = runs.filter((run) => run.taskId === task.id);
  const table = taskRuns.length ? `<div class="table-scroll"><table class="results-table"><thead><tr><th>Agent / Model</th><th>原生指标</th><th>结果</th><th>消耗</th><th>状态</th><th>记录</th></tr></thead><tbody>${taskRuns.map((run) => `
    <tr><td><strong>${e(run.agent)}</strong><small>${e(run.model)}</small><small>${e(run.date || run.id)}</small></td>
    <td>${e(run.metricName || '—')}</td><td class="mono">${run.score == null ? '—' : e(run.score)} ${e(run.unit || '')}</td>
    <td>${run.durationSeconds == null ? '—' : `${e(run.durationSeconds)} s`}<small>${run.tokens == null ? 'Tokens 未记录' : `${e(run.tokens)} tokens`}</small></td>
    <td>${tag(runLabels[run.status])}</td><td>${run.tracePath ? `<button class="text-button" data-action="load-run" data-run="${e(run.id)}">查看 Trace ${icon('arrow')}</button>` : '<span class="muted-note">暂无 Trace</span>'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="results-preview-header"><span>Agent / Model</span><span>Score</span><span>Time</span><span>Verdict</span></div>${emptyState('layers', '等待第一份评测结果', '正式运行完成并核验后，这里将展示模型表现、原生指标、资源消耗和关联 traces。')}`;
  return `<div class="panel-intro"><div><div class="eyebrow">RESULTS & REPRODUCIBILITY</div><h2>每个结果，都有对应的记录。</h2></div><span class="quiet-count">${taskRuns.length} RUNS</span></div>${table}<div class="result-principles"><div><span>01</span><strong>保留条件</strong><p>模型、版本、工具与预算一起记录。</p></div><div><span>02</span><strong>区分成功与正确</strong><p>运行状态与科学判分分别展示。</p></div><div><span>03</span><strong>让结果可复核</strong><p>关联公开证据，而非仅展示数字。</p></div></div>`;
}

export function tracesPanel(task, runs, state) {
  const trace = state.trace;
  const available = runs.filter((run) => run.taskId === task.id && run.tracePath);
  const archive = available.length ? `<div class="archived-traces"><span>已归档</span>${available.map((run) => `<button class="button small secondary" data-action="load-run" data-run="${e(run.id)}">${e(run.agent)} · ${e(run.id)} ${icon('arrow')}</button>`).join('')}</div>` : '';
  return `${archive}<div class="panel-intro"><div><div class="eyebrow">THE EVIDENCE TRAIL</div><h2>沿着执行过程，理解结果。</h2></div><button class="button small secondary" data-action="download-template">${icon('download')}格式模板</button></div><p class="panel-description">展示任务、工具调用、环境反馈与评测摘要。仅发布已审核、脱敏的记录。</p>${trace ? `<div class="trace-notice ${trace.isExample ? 'example' : ''}">${icon('info')}<span>${trace.isExample ? '版式示例 · 不代表真实执行或评测结果' : state.traceOrigin === 'published' ? '已归档运行记录 · 与当前题目及运行 ID 关联' : '本地预览 · 未上传、未写入网站题库，也不计入正式成绩'}</span><button class="text-button" data-action="clear-trace">清除</button></div><div class="trace-meta"><span class="mono">${e(trace.runId)}</span><span>${trace.events.length} 个事件</span></div><div class="trace-toolbar"><div class="trace-filters" role="group" aria-label="按事件类型筛选">${[['all', '全部'], ...Object.entries(eventTypes)].map(([type, name]) => `<button data-action="trace-filter" data-value="${type}" class="filter-pill ${state.traceFilter === type ? 'active' : ''}" aria-pressed="${state.traceFilter === type}">${name}</button>`).join('')}</div><button class="text-button" data-action="trace-format">${icon('code')}${state.traceFormat === 'json' ? '时间线' : 'JSON'}</button></div><div id="trace-events">${traceEvents(trace, state)}</div>` : emptyState('trace', available.length ? '选择一份执行记录' : '真实 traces 尚未发布', available.length ? '点击上方已归档运行查看完整记录，或使用下方本地预览功能。' : '可以查看一份明确标注的版式示例，或在本机预览已转换为展示格式的脱敏 JSON。', `<button class="button primary" data-action="show-demo">查看结构示例 ${icon('arrow')}</button><button class="button secondary" data-action="import-trace">${icon('upload')}本地预览 JSON</button>`)}<input type="file" id="trace-file" accept="application/json,.json" hidden/><p id="trace-error" class="input-error" role="alert"></p><div class="trace-privacy">${icon('info')}<p><strong>展示数据，不暴露评测边界。</strong><br/>不要导入凭据、个人隐私、私有真值或隐藏测试。本地导入不上传文件；其他运行框架的导出记录需先转换为本站展示格式。</p></div>`;
}

export function traceEvents(trace, state) {
  const events = trace.events.filter((event) => state.traceFilter === 'all' || event.type === state.traceFilter);
  if (state.traceFormat === 'json') return `<pre class="json-view"><code>${e(JSON.stringify({ ...trace, events }, null, 2))}</code></pre>`;
  if (!events.length) return '<p class="small-empty">该类型暂无事件。</p>';
  return `<div class="trace-timeline">${events.map((event, index) => `<details class="trace-event" ${index === 0 ? 'open' : ''}><summary><span class="event-marker">${icon(event.type === 'tool' ? 'code' : event.type === 'verifier' ? 'check' : 'file')}</span><span class="event-heading"><span class="event-type">${e(eventTypes[event.type])}</span><strong>${e(event.title)}</strong></span><span class="event-time">${e(event.time)}</span>${icon('down')}</summary><div class="event-content"><pre>${e(event.content)}</pre></div></details>`).join('')}</div>`;
}

export function maintenanceDialog() {
  return `<dialog id="maintenance-dialog" class="maintenance-dialog"><div class="dialog-heading"><div><div class="eyebrow">KEEP THE NOTEBOOK GROWING</div><h2>内容维护</h2></div><button class="icon-button" data-action="close-dialog" aria-label="关闭内容维护说明">${icon('close')}</button></div>
    <p>任何访客都可以新增和编辑题目，无需账号登录。修改保存在当前浏览器中，不会改变其他访客看到的内容。</p>
    <p style="margin-top:18px"><a class="button primary" href="#/manage" data-action="close-dialog">进入题目管理 ${icon('arrow')}</a></p>
    <p class="muted-note">题目管理支持导入、导出完整题库 JSON。要更新公开网站，将审核后的导出文件替换项目中的 public/content/catalog.json，再提交并重新构建。</p>
    <p class="muted-note">清理浏览器数据会删除本地编辑，请定期导出备份。头像、结果和 Traces 通过项目文件维护；本地 Trace 预览不会上传。</p>
    <div class="dialog-footer"><span class="muted-note">独立静态网站 · 无远程写入服务</span><button class="button primary" data-action="close-dialog">明白了</button></div></dialog>`;
}
