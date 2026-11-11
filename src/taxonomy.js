export const TAXONOMY_VERSION = '2026-11-five-domains';
export const ALL_TRACKS = '全部任务方向';
export const trackDefinitions = [
  { id: 'frontier', number: '01', title: '前沿求解', english: 'Frontier Problem Solving', description: '有明确答案或验收条件，考查科学推理、建模与求解。', icon: 'search' },
  { id: 'research', number: '02', title: '开放研究与优化', english: 'Open Research & Optimization', description: '无唯一解，考查方案提出、实验迭代与可验证的性能提升。', icon: 'layers' },
  { id: 'workflow', number: '03', title: '专业软件与工作流', english: 'Scientific Software & Workflows', description: '考查工具协同、编程、排错及端到端可靠交付。', icon: 'code' },
];
export const tracks = trackDefinitions.map((track) => track.title);
export const domainDefinitions = [
  { id: 'molecular', number: '01', title: '量子化学、分子结构与性质', english: 'Quantum Chemistry, Molecular Structure & Properties', description: '电子结构、构象、非共价作用、光谱与性质反演。', tags: ['电子结构', '构象', '非共价作用', '光谱', '性质反演'], icon: 'molecule' },
  { id: 'reactions', number: '02', title: '反应机理、动力学与催化', english: 'Reaction Mechanisms, Kinetics & Catalysis', description: '过渡态、反应路径、反应热力学、速率与选择性。', tags: ['过渡态', '反应路径', '反应热力学', '速率', '选择性'], icon: 'reaction' },
  { id: 'dynamics', number: '03', title: '分子模拟、统计力学与自由能', english: 'Molecular Simulation, Statistical Mechanics & Free Energy', description: 'MD／MC、溶剂化、输运、增强采样与自由能计算。', tags: ['MD / MC', '溶剂化', '输运', '增强采样', '自由能计算'], icon: 'wave' },
  { id: 'materials', number: '04', title: '材料、表面与界面设计', english: 'Materials, Surface & Interface Design', description: '晶体、缺陷、相稳定性、吸附、界面与材料逆向设计。', tags: ['晶体', '缺陷', '相稳定性', '吸附', '界面', '材料逆向设计'], icon: 'crystal' },
  { id: 'learning', number: '05', title: 'Foundation Model', english: 'Foundation Model R&D for Computational Chemistry', description: '通用原子势、三维分子表征、多精度预训练，以及数据、架构和训练策略优化。', tags: ['通用原子势', '三维分子表征', '多精度预训练', '数据优化', '架构设计', '训练策略'], icon: 'network' },
];

const moduleAliases = { electronic: 'materials', stability: 'materials', surfaces: 'materials' };
const trackAliases = { '工作流': '专业软件与工作流', '改进优化': '开放研究与优化', '逆向研究': '前沿求解' };

export function resolveModule(id = '') {
  return Object.hasOwn(moduleAliases, id) ? moduleAliases[id] : id;
}

export function resolveTrack(value) {
  return Object.hasOwn(trackAliases, value) ? trackAliases[value] : value;
}

export function trackFilter(value) {
  const canonical = resolveTrack(value);
  return tracks.includes(canonical) ? canonical : ALL_TRACKS;
}

export function normalizeCatalog(data) {
  if (!data || !Array.isArray(data.modules) || !Array.isArray(data.tasks) || data.taxonomyVersion === TAXONOMY_VERSION) return data;
  const ids = new Set(domainDefinitions.map((module) => module.id));
  for (const module of data.modules) {
    if (!ids.has(resolveModule(module.id))) throw new Error(`领域 ${module.id} 未定义迁移映射，停止自动迁移。`);
  }
  const modules = domainDefinitions.map((definition) => {
    const previous = data.modules.find((module) => module.id === definition.id) || {};
    const { group: _legacyGroup, ...metadata } = previous;
    return { ...metadata, ...structuredClone(definition) };
  });
  const tasks = data.tasks.map((task) => {
    const module = resolveModule(task.module);
    const track = resolveTrack(task.track);
    if (!ids.has(module) || !tracks.includes(track)) throw new Error(`题目 ${task.id} 的旧分类无法迁移，请先确认分类。`);
    return { ...task, module, track };
  });
  return { ...data, taxonomyVersion: TAXONOMY_VERSION, modules, taskDirections: structuredClone(trackDefinitions), tasks };
}
