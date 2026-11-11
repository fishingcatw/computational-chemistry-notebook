# Computational Chemistry · Research Notebook

一个用于展示计算化学与材料领域 Agent 评测题、中文解读、运行结果和执行记录的个人研究网站。采用受 [PRISM](https://github.com/xyjoey/PRISM) 启发的简洁双栏设计，支持深浅色主题和移动端。

**独立静态项目，无需账号、API Key、数据库或专用后端。** 可以本地运行，也可以托管到 GitHub Pages 或其他静态服务。

> 当前包含 5 个领域、3 个任务方向与 7 道示例草稿。草稿用于展示题库结构，不代表已验证的完整评测任务；项目未附带虚构成绩。

## 功能

- **About**：个人资料、研究兴趣、精选题目与公开研究资源。
- **题目地图**：按领域、任务方向及关键词查找题目，支持深层链接。
- **题目详情**：题面、中文解释、输入约束、交付要求、评分条件与来源。
- **结果与 Traces**：展示原生指标、耗时、Token、运行状态及可展开的事件时间线；支持本地 JSON 预览与模板下载。
- **题目管理**：任何访客都可以新增、编辑、复制题目，并导入或导出完整题库 JSON。
- **本地持久化**：编辑、主题和收藏偏好保存在当前浏览器；不会自动写入仓库或修改其他访客的数据。

## 快速开始

需要 **Node.js 22.12 或更新的兼容版本**以及 npm。在项目根目录依次运行：

1. `npm ci`：按锁文件安装依赖。
2. `npm run dev`：启动开发服务。
3. 打开终端显示的地址，默认 `http://127.0.0.1:5173`。

其他命令：

| 命令 | 用途 |
| --- | --- |
| `npm test` | 校验数据、分类兼容、题库合并与输入边界 |
| `npm run test:e2e` | 桌面和移动尺寸浏览器测试；需要本机安装 Google Chrome |
| `npm run build` | 校验内容并生成 `dist/` |
| `npm run preview` | 通过本地 HTTP 服务预览生产构建 |

不要直接双击 `index.html`：本站通过 HTTP 加载 JSON 和模块资源。

## 题库组织

领域与任务方向是两个独立维度。

| 领域 | 覆盖内容 |
| --- | --- |
| 量子化学、分子结构与性质 | 电子结构、构象、非共价作用、光谱与性质反演 |
| 反应机理、动力学与催化 | 过渡态、反应路径、反应热力学、速率与选择性 |
| 分子模拟、统计力学与自由能 | MD／MC、溶剂化、输运、增强采样与自由能 |
| 材料、表面与界面设计 | 晶体、缺陷、相稳定性、吸附、界面与逆向设计 |
| Foundation Model | 通用原子势、三维分子表征、多精度预训练、数据与训练策略 |

三个任务方向：

- **前沿求解**：有明确答案或验收条件，考查推理、建模与求解。
- **开放研究与优化**：无唯一解，考查方案提出、迭代与可验证的改进。
- **专业软件与工作流**：考查工具协同、编程、排错与可靠交付。

## 在网页里编辑题目

1. 点击导航中的 **题目管理**，选择 **新增题目** 或已有条目的 **编辑题目**。
2. 填写内容后点击 **保存到此浏览器**；刷新后仍可继续查看。
3. 点击 **导出题库 JSON** 下载完整 `catalog.json`，用于备份或迁移。
4. 其他设备可通过 **导入题库 JSON** 载入；导入会替换该浏览器的本地题库，操作前先导出备份。
5. **恢复项目题库** 会删除本地编辑并重新使用项目自带数据，需要确认。

### 保存与发布的区别

- **本地编辑不是在线协同后台。** 不同浏览器、设备、网址或项目路径的编辑互不共享；清理站点数据、隐私模式退出可能丢失本地修改。
- 本地存储键按项目路径区分，兼容 GitHub Pages 的仓库子路径。
- 要更新所有访客看到的内容：审核导出的 JSON，替换 `public/content/catalog.json`，运行 `npm test` 和 `npm run build`，再提交仓库并重新部署。
- 如果项目默认题库有更新，而浏览器已有本地编辑，会提示保留了本地版本；请导出后合并，或恢复默认题库。
- 数据损坏时不会自动删除原始本地存储，可以导出存储备份再恢复。题库导入上限为 2 MB。
- 已有评测记录的题目不允许直接改写，使用 **复制为新题** 保留历史题面；这是数据一致性保护，不是管理员权限。
- `draft` 仅是状态标签，不是私密或权限设置。

## 自定义资料与结果

| 文件 | 内容 |
| --- | --- |
| `public/content/profile.json` | 姓名、简介、头像路径、研究兴趣和公开资源链接 |
| `public/content/catalog.json` | 领域定义、任务方向与题目内容 |
| `public/content/runs.json` | 正式运行结果，默认是空数组 |
| `public/content/trace-example.json` | 明确标记为示例的 Trace 模板 |
| `public/images/avatar-cat.jpg` | 当前头像；可替换并更新 `portraitAlt` |
| `src/taxonomy.js` | 分类名称、旧分类兼容映射 |

### 运行结果

`runs.json` 顶层包含 `runs` 数组。每条记录需要 `id`、`taskId`、`agent`、`model`、`status`；可选字段包括 `score`、`metricName`、`unit`、`durationSeconds`、`tokens`、`date`、`tracePath`。

状态为 `passed`、`failed`、`error` 或 `completed`。填写分数时必须提供 `metricName`，不同原生指标不会自动归一化或混排。

### 执行记录

将真实 Trace 放入 `public/content/traces/`，在对应运行中填写 `tracePath`，例如 `content/traces/run-001.json`。展示格式要求：

- `schemaVersion` 为 `1.0`；`taskId` 和 `runId` 分别对应题目和运行。
- `events` 是事件数组；事件含 `id`、`type`、`title`、`content`，可选 `time`。
- 类型支持 `task`、`tool`、`observation`、`verifier`、`assistant`。
- 正式记录不应设置 `isExample: true`。其他框架的原始记录需先转换。

网页中的 Trace 导入仅用于内存预览，不写入题库或结果文件。

## GitHub 与静态托管

本仓库不要求绑定任何自定义域名。**上传项目本身不会自动发布网站**。

如需 GitHub Pages：

1. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
2. 在 **Actions → Deploy GitHub Pages** 手动运行工作流。
3. 构建成功后，以工作流输出的实际页面地址为准。

工作流仅手动触发；仓库推送和 Pull Request 会运行独立的内容检查与构建 CI。GitHub Pages 是否支持当前仓库可见性，取决于 GitHub 账号方案；请以设置页为准。

部署到其他静态托管服务时，构建命令为 `npm ci && npm run build`，发布目录为 `dist/`。本站使用相对资源路径及 hash 路由，无需配置服务器端路由重写。

## 项目结构

- `src/`：页面、交互、样式、题库校验、本地存储与分类逻辑。
- `public/`：作为静态资源发布的数据、图片、字体和许可文件。
- `scripts/validate.mjs`：构建前内容校验。
- `tests/`：单元测试、浏览器测试及隔离的历史分类 fixture。
- `.github/workflows/`：CI 和可选的手动 Pages 发布工作流。

## 数据与第三方素材

任何提交到公开仓库或放入 `public/` 的内容都应按公开资料审核。不要提交 API Key、账号凭据、隐藏答案、私有验证器、内部调研资料或未获授权的数据。

版式参考 [PRISM](https://github.com/xyjoey/PRISM)，没有沿用参考作者的个人资料。字体使用自托管 Inter、DM Sans 和 Libre Baskerville，许可证位于 `public/fonts/`。头像由站点维护者提供；复用网站时请使用自己有权发布的图片。引用的数据和软件分别遵循其原始许可。
