// ============ 人体解剖 · BodyParts3D 真实数据加载器 ============
// 数据来源：BodyParts3D / anatomical structure database (DBCLS, Japan)
// 许可：CC BY-SA 2.1 JP（本项目按相同许可共享，UI 与 README 中已署名）
// 格式：atlas.json（2234 个部件元数据 + 15 个二进制分块索引）
//       body-N.bin.gz：[positions F32][normals Int16 snorm][indices Uint32] 逐部件顺序排列
import * as THREE from 'three';
import { part } from '../lib.js';

/** 系统定义（分组/配色/说明）—— 学习自 BodyParts3D 图谱的展示结构 */
export const ATLAS_SYSTEMS = {
  skeletal:      { zh: '骨骼', en: 'Skeletal', color: 0xe8dfc9, role: 'structure', rough: 0.52,
    desc: '骨骼构成身体的支撑框架，保护内脏，并为肌肉提供附着点。骨内组织还可储存矿物质并生成血细胞。' },
  muscular:      { zh: '肌肉', en: 'Muscular', color: 0xb0554e, role: 'internal', rough: 0.46,
    desc: '骨骼肌通过牵拉附着点产生运动。它们与肌腱协同，带动关节、维持姿势并产生热量。' },
  nervous:       { zh: '神经系统', en: 'Nervous', color: 0xe8c95a, role: 'internal', rough: 0.42,
    desc: '脑、脊髓与周围神经传递并处理信号，支持感觉、运动、协调以及对身体功能的自主调节。' },
  arterial:      { zh: '动脉', en: 'Arteries', color: 0xc0392b, role: 'internal', rough: 0.4,
    desc: '心脏驱动血液在循环系统中流动。动脉将血液从心脏输送至组织，或在肺循环中送往肺部。' },
  venous:        { zh: '静脉', en: 'Veins', color: 0x3d5a9e, role: 'internal', rough: 0.4,
    desc: '静脉将血液导回心脏。浅静脉与深静脉网络汇集组织血液；肺静脉则将含氧血从肺部带回。' },
  cardiac:       { zh: '心脏', en: 'Heart', color: 0xb23a3a, role: 'core', rough: 0.4,
    desc: '心脏是具有四个腔室的肌性泵。瓣膜引导血液向前流入肺循环与体循环。' },
  respiratory:   { zh: '呼吸系统', en: 'Respiratory', color: 0xd9a0a6, role: 'internal', rough: 0.45,
    desc: '气道将空气导入肺部，氧气与二氧化碳在此于空气和血液之间交换。呼吸依赖呼吸肌产生的压力变化。' },
  digestive:     { zh: '消化系统', en: 'Digestive', color: 0xc98868, role: 'internal', rough: 0.45,
    desc: '消化道分解食物、吸收营养与水分，并推动残渣前行。附属器官提供胆汁与消化酶。' },
  urinary:       { zh: '泌尿系统', en: 'Urinary', color: 0xd9c46a, role: 'internal', rough: 0.45,
    desc: '肾脏过滤血液并调节体液、电解质与酸碱平衡。尿液经输尿管进入膀胱，再经尿道排出。' },
  endocrine:     { zh: '内分泌系统', en: 'Endocrine', color: 0x9b6bc9, role: 'internal', rough: 0.45,
    desc: '内分泌器官向血液释放激素，以协调代谢、生长、应激反应与生殖等过程。' },
  lymphatic:     { zh: '淋巴系统', en: 'Lymphatic', color: 0x7aaf7a, role: 'internal', rough: 0.45,
    desc: '淋巴管将多余组织液回流至循环系统。淋巴结及其他淋巴器官支持免疫监视与应答。' },
  sensory:       { zh: '感觉器官', en: 'Sensory', color: 0x5ab8a8, role: 'internal', rough: 0.38,
    desc: '这些结构参与特殊感觉，包括视觉、听觉与平衡。特化组织感受刺激，并与神经系统协同传递信息。' },
  integumentary: { zh: '体表', en: 'Integumentary', color: 0xd9a184, role: 'shell', rough: 0.6,
    desc: '体表提供外层解剖参照。皮肤系统形成保护屏障，并参与感觉与体温调节。' },
  reproductive:  { zh: '生殖系统', en: 'Reproductive', color: 0xcc8f9f, role: 'internal', rough: 0.45,
    desc: '此处呈现的男性生殖结构参与精子的产生、成熟与输送，以及性激素的分泌。' },
  connective:    { zh: '结缔组织', en: 'Connective', color: 0xcfc0a8, role: 'internal', rough: 0.5,
    desc: '软骨、韧带及其他结缔组织支撑、连接并分隔结构，其作用包括稳定关节与分散机械负荷。' }
};

const DATA_BASE = './models/bodyparts3d/';

export async function buildHumanAtlas(onProgress) {
  const group = new THREE.Group();
  const refs = { systemRoots: {}, systemMeshCount: {} };

  /* ---- 1. 加载图谱元数据 ---- */
  onProgress?.('正在读取解剖图谱索引…');
  const atlas = await (await fetch(DATA_BASE + 'atlas.json')).json();
  const conceptsById = new Map(atlas.concepts.map(c => [c.id, c]));

  /* ---- 2. 系统根节点与统计 ---- */
  const bySystem = new Map();
  for (const p of atlas.parts) {
    if (!bySystem.has(p.system)) bySystem.set(p.system, []);
    bySystem.get(p.system).push(p);
  }
  const sysParams = [];
  for (const key of Object.keys(ATLAS_SYSTEMS)) {
    const def = ATLAS_SYSTEMS[key];
    const list = bySystem.get(key) || [];
    if (!list.length) continue;
    const root = new THREE.Group();
    root.userData.isPartRoot = true;
    root.userData.info = {
      name: def.zh.endsWith('系统') ? def.zh : `${def.zh}系统`, en: `${def.en} System`, role: def.role,
      desc: `${def.desc}（共 ${list.length} 个命名结构）`, system: key
    };
    group.add(root);
    refs.systemRoots[key] = root;
    refs.systemMeshCount[key] = 0;
    sysParams.push({
      id: `sys_${key}`, label: `${def.zh} (${list.length})`,
      type: 'toggle', value: key !== 'integumentary'
    });
  }

  /* ---- 3. 共享材质（每系统一份） ---- */
  const sysMaterials = {};
  for (const key of Object.keys(ATLAS_SYSTEMS)) {
    const def = ATLAS_SYSTEMS[key];
    sysMaterials[key] = new THREE.MeshStandardMaterial({
      color: def.color, roughness: def.rough, metalness: 0.03
    });
    sysMaterials[key].userData.isShared = true;
  }
  // 仅大体积系统投射阴影（血管/神经等细小结构投影不可见，却让阴影 pass 多千余次绘制）
  const SHADOW_SYSTEMS = new Set(['skeletal', 'muscular', 'integumentary', 'digestive']);

  /* ---- 4. 分块解码 ---- */
  const chunkBufs = new Array(atlas.chunks.length);
  async function gunzip(buf) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持 DecompressionStream，请使用新版 Chrome/Safari/Firefox');
    }
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }
  async function loadChunkBuffer(i) {
    if (chunkBufs[i]) return chunkBufs[i];
    let buf = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${DATA_BASE}body-${i}.bin.gz`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 300));
      }
    }
    // 服务器可能已透明解压（Content-Encoding），按 gzip 魔数判断
    const head = new Uint8Array(buf, 0, 2);
    if (head[0] === 0x1f && head[1] === 0x8b) buf = await gunzip(buf);
    chunkBufs[i] = buf;
    return buf;
  }

  /* ---- 5. 预取全部分块 ---- */
  const total = atlas.chunks.length;
  for (let i = 0; i < total; i++) {
    onProgress?.(`正在下载解剖数据 ${i + 1}/${total} …`);
    await loadChunkBuffer(i);
    // 让出主线程，避免下载间隙界面卡顿
    await new Promise(r => setTimeout(r, 0));
  }

  /* ---- 5b. 每系统合并为单个网格 ----
     2234 个独立网格会产生 ~2234 次绘制调用，低端设备难以承受；
     合并后每系统仅 1 次绘制调用（共 15 次），帧率提升数倍。
     逐结构记录 [triStart, triEnd) 索引区间，拾取时按区间做精确三角形相交。 */
  const structures = [];       // 交互用的结构记录（列表/拾取/信息卡）
  const systemParts = [];      // 展示模式用的部件单位（每系统一个网格）
  const sysAgg = new Map();
  for (const p of atlas.parts) {
    if (!sysAgg.has(p.system)) sysAgg.set(p.system, { vertTotal: 0, idxTotal: 0, list: [] });
    const s = sysAgg.get(p.system);
    if (!refs.systemRoots[p.system]) continue;   // 未知系统跳过
    s.vertTotal += p.vertexCount;
    s.idxTotal += p.indexCount;
    s.list.push(p);
  }

  let done = 0;
  for (const [key, agg] of sysAgg) {
    onProgress?.(`正在合并「${ATLAS_SYSTEMS[key].zh}」网格几何…`);
    const posArr = new Float32Array(agg.vertTotal * 3);
    const nrmArr = new Float32Array(agg.vertTotal * 3);
    const idxArr = new Uint32Array(agg.idxTotal);
    let vCursor = 0, iCursor = 0;
    for (const p of agg.list) {
      const buf = chunkBufs[p.chunk];
      const srcIdx = new Uint32Array(buf, p.indices, p.indexCount);
      posArr.set(new Float32Array(buf, p.positions, p.vertexCount * 3), vCursor * 3);
      const srcNrm = new Int16Array(buf, p.normals, p.vertexCount * 3);
      for (let i = 0; i < srcNrm.length; i++) nrmArr[vCursor * 3 + i] = srcNrm[i] / 32767;
      const triStart = iCursor / 3;
      for (let i = 0; i < srcIdx.length; i++) idxArr[iCursor++] = srcIdx[i] + vCursor;
      const b = p.bounds;
      const concept = conceptsById.get(p.conceptId);
      const sysDef = ATLAS_SYSTEMS[key];
      structures.push({
        sid: structures.length,   // 列表高亮用
        system: key, fma: p.conceptId,
        name: p.name, nameEn: p.nameEn || '',
        triStart, triEnd: iCursor / 3,
        bounds: new THREE.Box3(new THREE.Vector3(b[0][0], b[0][1], b[0][2]),
          new THREE.Vector3(b[1][0], b[1][1], b[1][2])),
        info: {
          name: p.name, en: p.nameEn || '', role: sysDef.role,
          desc: `${sysDef.desc}\n\n结构编号：${p.id}（FMA ${p.conceptId}）` +
            (concept ? ` · 归属：${concept.name}` : ''),
          system: key, fma: p.conceptId
        }
      });
      vCursor += p.vertexCount;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, sysMaterials[key]);
    mesh.castShadow = SHADOW_SYSTEMS.has(key);
    mesh.receiveShadow = false;
    mesh.userData.isPartRoot = true;
    mesh.userData.isSystemMesh = true;
    const def = ATLAS_SYSTEMS[key];
    mesh.userData.info = {
      name: def.zh.endsWith('系统') ? def.zh : `${def.zh}系统`, en: `${def.en} System`, role: def.role,
      desc: def.desc, system: key
    };
    // 拾取索引：按三角形区间二分查找（记录 sid 与 structures 对应）
    mesh.userData.segments = structures
      .filter(s => s.system === key)
      .sort((a, b) => a.triStart - b.triStart);
    for (const s of mesh.userData.segments) s.mesh = mesh;
    refs.systemRoots[key].add(mesh);
    systemParts.push({ root: mesh });
    refs.systemMeshCount[key] = agg.list.length;

    if (++done % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }
  chunkBufs.length = 0;   // 释放原始分块内存（网格已合并）

  /* ---- 7. 参数（系统显隐） ---- */
  const params = sysParams;

  function update(dt, t, p, ctx) {
    // 系统显隐由参数面板驱动；变化时需重绘阴影贴图
    for (const key of Object.keys(refs.systemRoots)) {
      const root = refs.systemRoots[key];
      if (!root) continue;
      const vis = p[`sys_${key}`] !== false;
      if (root.visible !== vis) {
        root.visible = vis;
        ctx?.viewer?.markShadowDirty?.();
      }
    }
  }

  const loadedCount = structures.length;
  return {
    group, parts: systemParts, params, update,
    atlas: true,
    structures,
    displayCount: loadedCount,
    systemRoots: refs.systemRoots,
    hud: () => `BodyParts3D 真实解剖 · ${loadedCount} 个结构 · 229 万三角面`
  };
}
