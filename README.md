# TwinLab · 3D 交互式建模 / 数字孪生展示网站

一个纯前端的 3D 交互式建模展示网站，基于 **Three.js + Vite** 构建。除人体解剖外，所有模型均为**程序化建模**（代码生成几何体，无需外部模型文件）；人体解剖使用 **BodyParts3D 真实解剖图谱数据**（2234 个命名结构），用于展示各类数字孪生作品的建模、剖析、拆解、组合、爆炸拆解、45° 展示与剖切等模式。

![技术栈](https://img.shields.io/badge/Three.js-r170-blue) ![构建](https://img.shields.io/badge/Vite-6-green) ![许可](https://img.shields.io/badge/license-MIT-lightgrey) ![数据](https://img.shields.io/badge/BodyParts3D-CC_BY_SA_2.1_JP-orange)

## 在线体验

部署到 GitHub Pages 后访问：`https://<你的用户名>.github.io/twinlab-3d/`（推送 main 分支后 CI 自动构建部署，见 `.github/workflows/deploy.yml`）。

## 预览

| | |
|---|---|
| ![人体解剖](docs/screenshots/anatomy.png) | ![丰田 2JZ-GTE](docs/screenshots/engine-2jz.png) |
| ![保时捷 911](docs/screenshots/porsche-911.png) | ![现代别墅](docs/screenshots/villa.png) |
| ![空客 A380](docs/screenshots/a380.png) | ![iPhone 17 Pro Max](docs/screenshots/iphone-17-pro-max.png) |

## 快速开始

```bash
npm install      # 安装依赖（three + vite）
npm run dev      # 启动开发服务器 → http://localhost:5173
npm run build    # 生产构建 → dist/
npm run preview  # 预览生产构建
```

## 功能总览

### 内置模型（7 大类）

| 模型 | 规模 | 亮点 |
|---|---|---|
| 人体解剖 | **2234 结构 · 229 万三角面** | **BodyParts3D 真实解剖数据**（DBCLS，CC BY-SA 2.1 JP）：骨骼 296 / 肌肉 402 / 动脉 639 / 静脉 404 / 神经 139 等 **15 大系统**；按系统显隐与配色；部件级点击拾取（包围盒粗筛 + 三角形精确相交）；X 光分层透视；离线 gzip 分块加载（约 44MB） |
| 发动机 | 20 部件 | **丰田 2JZ-GTE 直列六缸双涡轮 1:1 建模**：6 缸曲柄连杆相位运动学（点火 1-5-3-6-2-4）、DOHC 凸轮轴 1:2 减速、正时皮带+多楔带闭环精确相切联动、CT20 双涡轮随增压压力 spool，排气歧管随转速/增压烧红 |
| 轿车 | 23 部件 | **保时捷 911 (992) Carrera 1:1 建模**：飞线快背车顶、贯穿式 LED 尾灯、可升降主动尾翼、五联圆仪表、后置 3.0T 水平对置六缸+8 速 PDK、前窄后宽车轮（245/40 R19 · 295/35 R20）、黄色卡钳、夜间灯光 |
| 别墅 | 30 部件 | **现代两层平顶别墅 1:1 建模**：8×4m 泳池（水下灯+扶梯）、车库卷帘门（可卷动）、二层阳台玻璃栏杆、围墙电动平移门、太阳能板、空调外机、全屋家具，夜间室内/庭院/泳池灯光联动 |
| 客机 | 20 部件 | **空客 A380-800 1:1 建模**：72.7m 双层卵形机身、上下双排舷窗、22 轮起落架（前 2 + 翼下 4×2 + 机身 6×2）、4 发翼吊（22 叶风扇旋转）、33.5° 后掠 NACA 翼型机翼、上下双叉翼梢翼刀、富勒襟翼偏转、起落架收放 |
| 智能手机 | 13 部件 | **iPhone 17 Pro Max 1:1 建模**（宇宙橙）：全宽相机高原+三摄三角布局（抛光铝圈+蓝宝石镜片）、LiDAR 与闪光灯、灵动岛、USB-C、L 形电池与 A19 Pro 主板堆叠，Canvas 屏幕 UI（4 套主题）、无线充电呼吸光环 |
| 笔记本电脑 | 17 部件 | **CNC 三明治机身结构**：C/D 面之间镁铝合金中框骨架 + 侧壁 I/O（双 USB-C / 双 USB-A / HDMI / SD），屏幕开合角阻尼动画、风扇转速、Canvas 桌面画面 |

### 七种展示模式（快捷键 1-7）

1. **建模** — PBR 材质 + CAD 风格描边的实体视图
2. **剖析** — X 光模式：外壳按角色半透明，透视内部结构（透明度可调）
3. **拆解** — 按装配层级分步炸开，进度条拖动 / 一键播放动画
4. **组合** — 装配动画：散件按"内层先装"次序自动组装成型
5. **爆炸视图** — 径向炸开 + 部件名称标注 + 引导线（幅度/标注/引导线可开关）
6. **45° 展示** — 方位角 45°、仰角 28° 的标准产品展示机位
7. **剖切** — X/Y/Z 三轴动态剖面，位置拖动、翻转、切面可视化

### 其他交互

- **旋转 / 缩放 / 平移**：左键旋转、滚轮缩放、右键平移（OrbitControls 带阻尼）
- **点击部件**：显示名称、英文名、角色与**功能说明**（解剖结构附 FMA 编号与 DBCLS 署名），黄色包围盒高亮，支持"聚焦此部件"与"只显示所属系统"
- **部件列表**：全部部件可搜索、点击定位聚焦；人体解剖按**系统分组折叠**（2234 项）
- **模型参数面板**：每个模型独立的实时参数（转速/心率/车速/襟翼角/开合角…），滑块带实时数值与 HUD 读数
- **昼夜切换**（快捷键 N）：天空/光照/网格/星空全套切换，模型灯光联动（窗户、车灯、屏幕）
- **显示选项**：边线 / 线框 / 网格地面 / 自动旋转（转台展示）
- **重置视角**（快捷键 R）、**Esc** 取消选择

## 如何补充新的分类 / 模型

所有模型在 `src/models/registry.js` 中注册，界面**自动生成**顶部标签与入口。

### 方式一：新增一个模型文件（推荐）

1. 在 `src/models/` 下新建 `drone.js`：

```js
import * as THREE from 'three';
import { M, part, mesh, addEdges } from '../lib.js';

export function buildDrone() {
  const group = new THREE.Group();
  const parts = [];

  // 用 part() 注册部件：name/en/role(外壳shell|结构structure|内部internal|核心core)/desc
  const arm = new THREE.Group();
  arm.add(mesh(new THREE.BoxGeometry(0.8, 0.05, 0.08), M.metal(0x2b323b, 0.5)));
  addEdges(arm);
  parts.push({
    root: part(group, arm, {
      name: '机臂', en: 'Arm', role: 'structure',
      desc: '连接机身与电机座，碳纤维管材抗扭性强。'
    }),
    explode: [0.8, 0.3, 0]   // 可选：手动指定爆开方向（默认按部件位置径向爆开）
  });

  // 可选：可调参数（滑块/开关/下拉）
  const params = [
    { id: 'rpm', label: '电机转速', type: 'range', min: 0, max: 100, step: 1, value: 30, unit: ' %' }
  ];

  // 每帧动画：p 为参数值对象，ctx.night 为昼夜状态
  function update(dt, t, p, ctx) { /* 旋转桨叶等 */ }

  return { group, parts, params, update };
}
```

2. 在 `src/models/registry.js` 注册：

```js
import { buildDrone } from './drone.js';

export const MODELS = [
  // ...现有条目
  {
    id: 'drone', name: '无人机', sub: 'DRONE',
    icon: ICONS.plane,            // 或新增图标
    desc: '四旋翼无人机结构',
    build: buildDrone
  }
];
```

刷新页面即出现新标签，自动获得全部 7 种展示模式、部件列表、拾取高亮与参数面板能力。

### 方式二：控制台运行时注册

```js
window.DTW.registerModel({ id: 'test', name: '测试', build: () => ({ group, parts, params, update }) });
window.DTW.loadModel('test');
window.DTW.list();   // 查看全部模型
```

### 部件数据结构约定

| 字段 | 说明 |
|---|---|
| `root` | 部件根 Object3D（爆拆移动它，动画请作用于其**子节点**，避免冲突） |
| `name / en / desc` | 部件中文名 / 英文名 / 功能描述（点击部件时展示） |
| `role` | `shell` 外壳（X 光会变透明）/ `structure` 结构 / `internal` 内部 / `core` 核心 |
| `explode` | 可选 `[x,y,z]` 手动爆开方向向量；缺省时按部件位置自动径向计算 |

## 项目结构

```
├── index.html              # 页面骨架（顶栏/模式条/左右面板/信息卡/状态栏）
├── src/
│   ├── app.js              # 主应用：UI 装配、模式控制、参数面板、拾取高亮、主循环
│   ├── viewer.js           # 3D 视口：场景/灯光/昼夜/相机适配/拾取（含合并网格拾取）/剖切
│   ├── modes.js            # 展示模式管理：爆拆/装配动画/X光/标注/引导线
│   ├── lib.js              # 材质工厂、部件注册、CAD 描边、几何工具
│   ├── styles.css          # 专业 CAD 风格暗色 UI
│   ├── models/
│   │   ├── registry.js     # ★ 模型注册表（在此新增分类/模型）
│   │   ├── humanAtlas.js   # 人体解剖（BodyParts3D 数据：分块加载/系统合并/结构索引）
│   │   ├── engine.js       # 发动机（曲柄连杆运动学）
│   │   └── car.js / house.js / airplane.js / phone.js / laptop.js
└── public/models/bodyparts3d/   # BodyParts3D 预处理数据（atlas.json + 15 个 gzip 分块）
```

## 人体解剖数据管线（BodyParts3D）

- **预处理**：BodyParts3D 原始 OBJ → 2234 个部件打包为 `atlas.json`（元数据 + 每部件在分块中的字节偏移/顶点数/包围盒）与 15 个 `body-N.bin.gz`（`[positions F32][normals Int16][indices Uint32]` 逐部件顺序排列）
- **加载**：`fetch` 分块下载 → `DecompressionStream('gzip')` 原地解压（零依赖、可离线）
- **渲染合并**：2234 个独立网格会产生 ~2200 次绘制调用（低端设备 <20 FPS），按系统合并为 **15 个网格**（18 次绘制调用，帧率约 2 倍以上提升）；逐结构记录三角形区间 `[triStart, triEnd)`
- **部件拾取**：射线先与 2234 个结构包围盒粗筛，再对候选结构的三角形区间精确相交（`Ray.intersectTriangle`）；悬停仅用包围盒近似，保证光标响应
- **阴影**：阴影贴图按需更新（`shadowMap.autoUpdate = false`），静态视角跳过整个阴影 pass；仅骨骼/肌肉/体表/消化 4 个大体积系统投射阴影
- **爆炸/组合**：以系统为部件单位分层炸开（外壳→肌肉→血管→骨骼），符合解剖学习习惯

## 数据来源与许可

- 解剖数据：[BodyParts3D / Anatomical Structure Ontology](https://lifesciencedb.jp/bp3d/) © DBCLS，遵循 **CC BY-SA 2.1 JP** 许可
- 本项目在信息卡与状态栏中展示 DBCLS 署名；如分发本项目或其衍生数据，请遵循相同许可并注明来源

## 技术说明

- **程序化建模**：发动机/轿车/别墅/客机/手机/笔记本全部几何体由代码生成，零外部资源依赖
- **CAD 曲面放样**：客机机身沿半径剖面放样（橄榄形鼻锥+尾锥上翘）、机翼为 **NACA 翼型截面沿展向放样**（锥比/后掠/上反角）、车身侧面轮廓挤出+倒角（`loftSections` / `superellipsePts` / `airfoilPts`）
- **变半径扫掠**：长骨两端膨大、胃 J 形、结肠袋、肌腹纺锤均由 `sweepTube` 沿曲线变半径/变椭圆截面扫掠生成
- **程序化质感**：噪声凹凸贴图模拟皮肤毛孔/骨质/织物；皮肤使用带 Sheen 的物理材质
- **PBR 渲染**：`RoomEnvironment` 环境反射 + ACES 色调映射 + 软阴影，呈现专业软件质感
- **曲柄连杆运动学**：`y = r·cosθ + √(L²−r²sin²θ)`，连杆摆角 `asin(r·sinθ/L)`，凸轮轴按 1:2 同步
- **装配/拆解次序**：按部件到模型中心的距离计算交错延迟，实现"外层先拆、内层先装"
- **剖切**：`material.clippingPlanes` 局部裁剪（不影响地面），自动切换双面渲染展示内壁
- **标注**：`CSS2DRenderer` 渲染部件标签，引导线为动态 BufferGeometry
