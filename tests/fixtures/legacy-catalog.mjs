export function legacyCatalog(catalog) {
  const legacyModules = ['molecular', 'reactions', 'electronic', 'stability', 'dynamics', 'surfaces', 'learning'];
  const moduleFor = { 'MAT-001': 'electronic', 'MAT-002': 'stability', 'SURF-001': 'surfaces' };
  const tracks = { '前沿求解': '逆向研究', '开放研究与优化': '改进优化', '专业软件与工作流': '工作流' };
  const { taxonomyVersion: _taxonomy, taskDirections: _directions, ...base } = structuredClone(catalog);
  return {
    ...base,
    modules: legacyModules.map((id, i) => ({ id, number: String(i + 1).padStart(2, '0'), title: `旧模块 ${id}`, tags: [], group: '旧分组' })),
    tasks: base.tasks.map((task) => ({ ...task, module: moduleFor[task.id] || task.module, track: tracks[task.track] || task.track })),
  };
}
