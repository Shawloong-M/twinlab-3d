// ============ 现代两层平顶别墅（墙体开洞挤出 · 泳池/车库/庭院全套配套 · 夜间灯光） ============
// 占地 15m × 12m，一层层高 3.2m、二层 3.0m，正面（+Z）为入户与泳池庭院
import * as THREE from 'three';
import { M, part, mesh, addEdges, noiseBump } from '../lib.js';

export function buildHouse() {
  const group = new THREE.Group();
  const parts = [];
  const refs = {
    winGlass: [],        // 外窗玻璃（夜间透光）
    lampMats: [],        // 室内/门廊灯具发光件
    intLights: [],       // 室内点光源
    courtMats: [],       // 庭院灯具发光件（夜间）
    courtLights: [],     // 庭院点光源
    poolLights: [],      // 泳池水下灯
    tvMat: null, waterMat: null, water: null, waterY: -0.28,
    poolDiscMat: null, rollSpin: null,
    doorL: null, doorR: null, gate: null,
    slats: [], GATE_X: -10.1, SH_H: 2.4, SLAT: 2.4 / 21
  };

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };

  /* ---------- 尺寸常量（米） ---------- */
  const HX = 7.5, HZ = 6.0;          // 主体半宽/半深 → 15 × 12 m
  const T = 0.24;                    // 外墙厚
  const F1 = 0.45;                   // 首层室内地面标高（+0.45，三级台阶上台基）
  const SLAB1 = 3.50, L2F = 3.65;    // 二层楼板底/顶（层高 3.2m）
  const ROOF0 = 6.50, ROOF1 = 6.70;  // 屋面结构底/顶（二层高 3.0m）
  const PAR = 7.20;                  // 女儿墙顶
  const OV = 0.6;                    // 平屋顶挑檐

  /* ---------- 材质 ---------- */
  const matWall = () => {            // 白色真石漆
    const m = M.plastic(0xf1ede4, 0.86);
    m.bumpMap = noiseBump(5, 128, 1500); m.bumpScale = 0.22;
    return m;
  };
  const matWood = (c = 0x9a744c, r = 0.72) => M.plastic(c, r);
  const matDark = () => M.plastic(0x3d434b, 0.62);   // 深灰屋面/压顶/格栅底色
  const matFrame = () => M.plastic(0x2e343b, 0.5);   // 深灰铝门窗框
  const matConc = () => M.plastic(0xa8aba6, 0.92);   // 混凝土
  const matWhite = () => M.plastic(0xf4f2ec, 0.7);
  const matSteel = () => M.metal(0xb9c2cc, 0.35, 0.85);
  const grassMat = () => M.plastic(0x6f9c55, 0.95);

  /** 玻璃（带夜间透光 emissive） */
  const glassMat = (color = 0xbfd9e8, opacity = 0.3) => {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.05, metalness: 0, transparent: true, opacity,
      emissive: 0xffd9a0, emissiveIntensity: 0.1,
      side: THREE.DoubleSide, envMapIntensity: 1.4
    });
    refs.winGlass.push(m);
    return m;
  };
  const lampMat = (color = 0xffd9a0) => {
    const m = M.emis(color, 0.18, { color: 0xfff3dd });
    refs.lampMats.push(m);
    return m;
  };
  const warmLight = (x, y, z, dist = 9, color = 0xffd9a0) => {
    const l = new THREE.PointLight(color, 0, dist, 1.8);
    l.position.set(x, y, z);
    refs.intLights.push(l);
    return l;
  };

  /** 带门窗洞口的墙体：Shape + holes 挤出（洞口 {x, w, y0, y1}，x 为墙长向局部坐标） */
  function wallPanel(len, h, t, holes = []) {
    const s = new THREE.Shape();
    s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h);
    s.closePath();
    for (const o of holes) {
      const p = new THREE.Path();
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2;
      p.moveTo(x0, o.y0); p.lineTo(x1, o.y0); p.lineTo(x1, o.y1); p.lineTo(x0, o.y1);
      p.closePath();
      s.holes.push(p);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
    geo.translate(0, 0, -t / 2);
    return geo;
  }
  const wallMesh = (len, h, t, holes, mat) => {
    const m = mesh(wallPanel(len, h, t, holes), mat || matWall());
    return m;
  };

  /** 断桥铝窗：深灰窄框 + 中挺 + 中空玻璃 */
  function makeWindow(w, h, cols = 1, rows = 1) {
    const root = new THREE.Group();
    const fm = matFrame(), t = 0.06;
    root.add(mesh(new THREE.BoxGeometry(w + 2 * t, t, t * 1.5), fm, 0, h / 2 + t / 2, 0));
    root.add(mesh(new THREE.BoxGeometry(w + 2 * t, t, t * 1.5), fm, 0, -h / 2 - t / 2, 0));
    root.add(mesh(new THREE.BoxGeometry(t, h + 2 * t, t * 1.5), fm, -w / 2 - t / 2, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(t, h + 2 * t, t * 1.5), fm, w / 2 + t / 2, 0, 0));
    for (let i = 1; i < cols; i++) {
      root.add(mesh(new THREE.BoxGeometry(t * 0.8, h, t), fm, -w / 2 + i * w / cols, 0, 0));
    }
    for (let i = 1; i < rows; i++) {
      root.add(mesh(new THREE.BoxGeometry(w, t * 0.8, t), fm, 0, -h / 2 + i * h / rows, 0));
    }
    const g = mesh(new THREE.PlaneGeometry(w, h), glassMat());
    g.userData.noEdges = true;
    root.add(g);
    return root;
  }
  /** 推拉玻璃门（两扇，含中挺） */
  function makeSlider(w, h) {
    const root = new THREE.Group();
    const fm = matFrame(), t = 0.06;
    root.add(mesh(new THREE.BoxGeometry(w + 2 * t, t, t * 1.5), fm, 0, h / 2 + t / 2, 0));
    root.add(mesh(new THREE.BoxGeometry(w + 2 * t, t * 1.3, t * 2.2), fm, 0, -h / 2 - t * 0.6, 0.01));
    root.add(mesh(new THREE.BoxGeometry(t, h + t, t * 1.5), fm, -w / 2 - t / 2, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(t, h + t, t * 1.5), fm, w / 2 + t / 2, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(t * 0.9, h, t * 1.2), fm, 0, 0, 0));
    for (const s of [-1, 1]) {
      const g = mesh(new THREE.PlaneGeometry(w / 2 - 0.03, h - 0.05), glassMat());
      g.position.set(s * w / 4, 0, 0);
      g.userData.noEdges = true;
      root.add(g);
    }
    return root;
  }
  /** 落地幕墙（整片玻璃 + 竖向龙骨） */
  function makeCurtain(w, h, bays) {
    const root = new THREE.Group();
    const fm = matFrame();
    root.add(mesh(new THREE.BoxGeometry(w, 0.1, 0.13), fm, 0, h / 2 - 0.05, 0));
    root.add(mesh(new THREE.BoxGeometry(w, 0.12, 0.16), fm, 0, -h / 2 + 0.04, 0.01));
    for (let i = 1; i < bays; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.075, h - 0.2, 0.11), fm, -w / 2 + i * w / bays, 0, 0));
    }
    const g = mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.18), glassMat(0xc4dcea, 0.28));
    g.userData.noEdges = true;
    root.add(g);
    return root;
  }

  /* ================================================================
     1. 地基与首层地板（台基 + 木地面）
  ================================================================ */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(15.5, 0.45, 12.5), matConc(), 0, 0.225, 0));         // 钢混台基
    root.add(mesh(new THREE.BoxGeometry(14.5, 0.03, 11.5), matWood(0xa8845c, 0.7), 0, F1 + 0.015, 0)); // 一层实木地面
    addEdges(root, 40);
    P(root, { name: '地基与首层地板', en: 'Foundation & Ground Floor', role: 'structure',
      desc: '钢筋混凝土筏板基础将上部荷载传入持力层，台基高出庭院地面 450mm 防止雨水倒灌；面层为实木复合地板，下铺防潮垫与地暖盘管。' },
      [0, -0.35, 0]);
  }

  /* ================================================================
     2. 一层墙体（前后左右外墙开洞 + 台度）
  ================================================================ */
  {
    const root = new THREE.Group();
    // 前墙（+Z）：入户双开门 + 客厅落地幕墙 + 两窗
    const wF = wallMesh(15, 3.05, T, [
      { x: -3.3, w: 2.0, y0: 0, y1: 2.4 },      // 入户门洞
      { x: 3.7, w: 7.0, y0: 0.12, y1: 2.95 },   // 客厅落地幕墙洞
      { x: -6.2, w: 1.5, y0: 0.9, y1: 2.5 },    // 西侧窗
      { x: -1.2, w: 1.2, y0: 0.9, y1: 2.5 }     // 玄关窗
    ]);
    wF.position.set(0, F1, HZ - T / 2);
    root.add(wF);
    // 后墙：厨房窗 + 餐厅推拉门 + 窗
    const wB = wallMesh(15, 3.05, T, [
      { x: -4.6, w: 1.8, y0: 1.05, y1: 2.45 },  // 厨房窗
      { x: 0.6, w: 1.2, y0: 0.9, y1: 2.5 },
      { x: 3.4, w: 2.4, y0: 0.12, y1: 2.5 }     // 餐厅玻璃推拉门
    ]);
    wB.position.set(0, F1, -HZ + T / 2);
    root.add(wB);
    // 西墙（面向车库结合部，多数被车库贴建）
    const wW = wallMesh(12, 3.05, T, [
      { x: -4.2, w: 1.4, y0: 1.05, y1: 2.45 }   // 厨房侧窗
    ]);
    wW.position.set(-HX + T / 2, F1, 0);
    wW.rotation.y = -Math.PI / 2;
    root.add(wW);
    // 东墙：客厅侧落地窗 + 餐厅侧窗
    const wE = wallMesh(12, 3.05, T, [
      { x: 2.8, w: 2.6, y0: 0.12, y1: 2.9 },    // 客厅侧落地窗
      { x: -3.5, w: 1.6, y0: 0.9, y1: 2.5 }
    ]);
    wE.position.set(HX - T / 2, F1, 0);
    wE.rotation.y = -Math.PI / 2;
    root.add(wE);
    addEdges(root, 40);
    P(root, { name: '一层墙体', en: 'First Floor Walls', role: 'structure',
      desc: '200 厚加气混凝土砌块外墙 + 外保温真石漆饰面，门窗洞口设混凝土过梁与构造柱；客厅整面落地幕墙采用点挂式钢化中空玻璃。' },
      [0, 0.25, 0.3]);
  }

  /* ================================================================
     3. 二层楼板（留楼梯井洞）
  ================================================================ */
  {
    const root = new THREE.Group();
    const yC = (SLAB1 + L2F) / 2, sT = L2F - SLAB1;
    // 楼梯井洞 X ∈ [-5.6, -4.2], Z ∈ [-1.7, -0.2]，四块板围合
    const boxes = [
      [15, 4.3, 0, -3.85],        // Z ∈ [-6, -1.7]
      [15, 6.2, 0, 2.9],          // Z ∈ [-0.2, 6]
      [1.9, 1.5, -6.55, -0.95],   // X ∈ [-7.5, -5.6]
      [11.7, 1.5, 1.65, -0.95]    // X ∈ [-4.2, 7.5]
    ];
    for (const [w, d, x, z] of boxes) {
      root.add(mesh(new THREE.BoxGeometry(w, sT, d), M.plastic(0xd9d4c9, 0.85), x, yC, z));
    }
    // 悬挑部分楼板（客厅上方，Z 6→7.5）
    root.add(mesh(new THREE.BoxGeometry(6.5, sT, 1.5), M.plastic(0xd9d4c9, 0.85), 4.25, yC, 6.75));
    root.add(mesh(new THREE.BoxGeometry(14.5, 0.03, 11.5), matWood(0xa8845c, 0.7), 0, L2F + 0.015, 0));   // 二层木地面
    root.add(mesh(new THREE.BoxGeometry(6.5, 0.03, 1.72), matWood(0xa8845c, 0.7), 4.25, L2F + 0.015, 6.61)); // 悬挑段地面
    addEdges(root, 40);
    P(root, { name: '二层楼板', en: 'Second Floor Slab', role: 'structure',
      desc: '现浇混凝土楼板 150 厚，楼梯井四周设反沿；客厅上方部分向外悬挑 1.5m，由楼板内的上翻边梁与后部压重共同抗倾覆。' },
      [0, 0.45, 0]);
  }

  /* ================================================================
     4. 二层墙体（含悬挑立面与内隔墙）
  ================================================================ */
  {
    const root = new THREE.Group();
    // 前墙西段（主卧，退于阳台之后）X ∈ [-7.5, 1.0]
    const f1 = wallMesh(8.5, 2.85, T, [
      { x: 0.15, w: 2.2, y0: 0, y1: 2.3 },      // 主卧阳台推拉门（局部坐标 = 世界X + 3.25）
      { x: -2.55, w: 1.8, y0: 0.9, y1: 2.5 }    // 主卧窗
    ]);
    f1.position.set(-3.25, L2F, HZ - T / 2);
    root.add(f1);
    // 悬挑前墙（书房）X ∈ [1.0, 7.5]，位于 Z=7.5
    const f2 = wallMesh(6.5, 2.85, T, [
      { x: 0, w: 4.6, y0: 0.15, y1: 2.75 }      // 书房落地幕墙
    ]);
    f2.position.set(4.25, L2F, 7.5 - T / 2);
    root.add(f2);
    // 东墙（加长覆盖悬挑段）Z ∈ [-6, 7.5]
    const e2 = wallMesh(13.5, 2.85, T, [
      { x: 5.8, w: 2.0, y0: 0.12, y1: 2.75 },   // 书房侧落地窗
      { x: -3.0, w: 1.5, y0: 0.9, y1: 2.5 }     // 次卧窗
    ]);
    e2.position.set(HX - T / 2, L2F, 0.75);
    e2.rotation.y = -Math.PI / 2;
    root.add(e2);
    // 后墙
    const b2 = wallMesh(15, 2.85, T, [
      { x: -4.0, w: 1.6, y0: 0.9, y1: 2.5 },
      { x: 3.5, w: 2.0, y0: 0.9, y1: 2.5 }
    ]);
    b2.position.set(0, L2F, -HZ + T / 2);
    root.add(b2);
    // 西墙
    const w2 = wallMesh(12, 2.85, T, [
      { x: -3.5, w: 1.2, y0: 1.3, y1: 2.5 }     // 卫生间高窗
    ]);
    w2.position.set(-HX + T / 2, L2F, 0);
    w2.rotation.y = -Math.PI / 2;
    root.add(w2);
    // 内隔墙：主卧东墙 / 书房西墙 / 走廊北墙（带门洞）
    const pm = matWhite();
    root.add(mesh(new THREE.BoxGeometry(0.12, 2.85, 4.0), pm, -0.5, L2F + 1.425, 4.0));
    root.add(mesh(new THREE.BoxGeometry(0.12, 2.85, 5.5), pm, 1.0, L2F + 1.425, 4.75));
    root.add(mesh(new THREE.BoxGeometry(5.5, 2.85, 0.12), pm, -4.75, L2F + 1.425, 2.0));  // X -7.5→-2.0
    root.add(mesh(new THREE.BoxGeometry(0.9, 2.85, 0.12), pm, -1.55, L2F + 1.425, 2.0));  // 门上过梁
    root.add(mesh(new THREE.BoxGeometry(0.6, 2.85, 0.12), pm, -0.8, L2F + 1.425, 2.0));   // X -1.1→-0.5
    root.add(mesh(new THREE.BoxGeometry(1.0, 2.85, 0.12), pm, 1.5, L2F + 1.425, 2.0));    // X 1.0→2.0
    root.add(mesh(new THREE.BoxGeometry(0.9, 2.85, 0.12), pm, 2.45, L2F + 1.425, 2.0));   // 门上过梁
    root.add(mesh(new THREE.BoxGeometry(4.6, 2.85, 0.12), pm, 5.2, L2F + 1.425, 2.0));    // X 2.9→7.5
    addEdges(root, 40);
    P(root, { name: '二层墙体', en: 'Second Floor Walls', role: 'structure',
      desc: '二层外墙与悬挑立面同为一体成型，转角处暗藏型钢柱；主卧与书房之间的轻钢龙骨隔墙内填岩棉，隔声量达 50dB。' },
      [0, 0.6, 0]);
  }

  /* ================================================================
     5. 平屋顶与挑檐（0.6m 挑檐 + 女儿墙）
  ================================================================ */
  {
    const root = new THREE.Group();
    const rm = matDark();
    const yC = (ROOF0 + ROOF1) / 2;
    // 主屋面板（西段 Z ≤ 6.6 + 悬挑段 Z 6.6→8.1），四周挑出 0.6m
    root.add(mesh(new THREE.BoxGeometry(15 + 2 * OV, ROOF1 - ROOF0, 12 + 2 * OV), rm, 0, yC, 0));
    root.add(mesh(new THREE.BoxGeometry(7.1, ROOF1 - ROOF0, 1.5), rm, 4.55, yC, 7.35));
    // 女儿墙（0.5m 高）+ 深灰压顶
    const runs = [
      [16.2, 0.2, 0, -6.6],      // 后
      [0.2, 13.2, -8.1, 0],      // 西
      [9.1, 0.2, -3.55, 6.6],    // 前西段
      [0.2, 1.5, 1.0, 7.35],     // 高差转角
      [7.1, 0.2, 4.55, 8.1],     // 前东段（悬挑）
      [0.2, 14.7, 8.1, 0.75]     // 东
    ];
    for (const [w, d, x, z] of runs) {
      root.add(mesh(new THREE.BoxGeometry(w, 0.5, d), matWall(), x, ROOF1 + 0.25, z));
      root.add(mesh(new THREE.BoxGeometry(w + 0.06, 0.07, d + 0.06), matDark(), x, ROOF1 + 0.535, z));
    }
    // 屋面构造层表面（浅色防水面层）
    root.add(mesh(new THREE.BoxGeometry(15.8, 0.02, 12.4), M.plastic(0x565d66, 0.8), 0, ROOF1 + 0.012, 0));
    addEdges(root, 40);
    P(root, { name: '平屋顶与挑檐', en: 'Flat Roof & Eaves', role: 'shell',
      desc: 'SBS 卷材防水平屋面，2% 找坡层内藏排水，四周 600mm 挑檐统一立面比例；女儿墙压顶金属披水板防止渗漏，檐口内嵌 LED 洗墙灯带。' },
      [0, 0.85, 0]);
  }

  /* ================================================================
     6. 外窗与玻璃幕墙系统
  ================================================================ */
  {
    const root = new THREE.Group();
    const put = (unit, x, y, z, ry = 0) => {
      unit.position.set(x, y, z);
      unit.rotation.y = ry;
      root.add(unit);
    };
    // 一层
    put(makeCurtain(7.0, 2.83, 4), 3.7, F1 + 1.535, HZ);                       // 客厅落地幕墙
    put(makeWindow(1.5, 1.6, 1, 2), -6.2, F1 + 1.7, HZ);                       // 西前窗
    put(makeWindow(1.2, 1.6, 1, 2), -1.2, F1 + 1.7, HZ);                       // 玄关窗
    put(makeWindow(1.8, 1.4, 1, 2), -4.6, F1 + 1.75, -HZ, Math.PI);            // 厨房后窗
    put(makeWindow(1.2, 1.6, 1, 2), 0.6, F1 + 1.7, -HZ, Math.PI);
    put(makeSlider(2.4, 2.38), 3.4, F1 + 1.31, -HZ, Math.PI);                  // 餐厅推拉门
    put(makeWindow(1.4, 1.4, 1, 1), -HX, F1 + 1.75, -4.2, -Math.PI / 2);       // 厨房侧窗
    put(makeCurtain(2.6, 2.78, 2), HX, F1 + 1.51, 2.8, Math.PI / 2);           // 客厅侧落地窗
    put(makeWindow(1.6, 1.6, 1, 2), HX, F1 + 1.7, -3.5, Math.PI / 2);
    // 二层
    put(makeSlider(2.2, 2.3), -2.0, L2F + 1.15, HZ);                           // 主卧阳台推拉门
    put(makeWindow(1.8, 1.6, 1, 2), -5.8, L2F + 1.7, HZ);                      // 主卧窗
    put(makeCurtain(4.6, 2.6, 4), 4.25, L2F + 1.45, 7.5);                      // 书房落地幕墙
    put(makeCurtain(2.0, 2.63, 2), HX, L2F + 1.435, 5.8, Math.PI / 2);         // 书房侧窗
    put(makeWindow(1.5, 1.6, 1, 2), HX, L2F + 1.7, -3.0, Math.PI / 2);
    put(makeWindow(1.6, 1.6, 1, 2), -4.0, L2F + 1.7, -HZ, Math.PI);
    put(makeWindow(2.0, 1.6, 2, 2), 3.5, L2F + 1.7, -HZ, Math.PI);
    put(makeWindow(1.2, 1.2, 1, 1), -HX, L2F + 1.9, -3.5, -Math.PI / 2);       // 卫生间高窗
    addEdges(root, 40);
    P(root, { name: '外窗与玻璃幕墙', en: 'Windows & Curtain Wall', role: 'shell',
      desc: '断桥铝节能窗框内嵌双银 Low-E 中空玻璃，传热系数 1.8 W/(㎡·K)；落地幕墙采用隐框做法，玻璃与竖向龙骨承受风压与温差变形。' },
      [0, 0.35, 0.5]);
  }

  /* ================================================================
     7. 入户双开门（木色 + 金属长拉手，参数驱动开合）
  ================================================================ */
  {
    const root = new THREE.Group();
    const fm = matFrame();
    root.add(mesh(new THREE.BoxGeometry(2.24, 0.14, T + 0.06), fm, -3.3, F1 + 2.47, HZ));        // 门楣
    root.add(mesh(new THREE.BoxGeometry(0.14, 2.54, T + 0.06), fm, -4.37, F1 + 1.2, HZ));        // 门框
    root.add(mesh(new THREE.BoxGeometry(0.14, 2.54, T + 0.06), fm, -2.23, F1 + 1.2, HZ));
    root.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.3), matSteel(), -3.3, F1 + 0.01, HZ + 0.1));// 门槛
    const mkLeaf = (hingeX, dir) => {
      const leaf = new THREE.Group();
      leaf.position.set(hingeX, 0, HZ + 0.03);
      const panel = mesh(new THREE.BoxGeometry(0.98, 2.34, 0.075), matWood(0x6e4a30, 0.55),
        dir * 0.49, F1 + 1.19, 0);
      leaf.add(panel);
      // 门板凹条造型
      for (let i = 0; i < 3; i++) {
        leaf.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.012), matWood(0x5e3f28, 0.6),
          dir * 0.49, F1 + 0.55 + i * 0.72, 0.045));
      }
      // 金属长拉手
      leaf.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.15, 10), M.chrome(0xd9dfe7),
        dir * 0.86, F1 + 1.2, 0.09));
      for (const yy of [F1 + 0.64, F1 + 1.76]) {
        leaf.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.07), matSteel(), dir * 0.86, yy, 0.055));
      }
      return leaf;
    };
    refs.doorL = mkLeaf(-4.31, 1);
    refs.doorR = mkLeaf(-2.29, -1);
    root.add(refs.doorL, refs.doorR);
    addEdges(root, 40);
    P(root, { name: '入户双开门', en: 'Entrance Double Door', role: 'internal',
      desc: '2.4m 高子母双开防盗门：实木饰面门扇内衬钢骨架与防火岩棉，智能锁支持指纹/密码/远程开锁，330mm 长拉手符合无障碍操作。' },
      [0.1, 0.15, 0.5]);
  }

  /* ================================================================
     8. 门廊台阶、雨棚与露台（二层阳台的支撑结构）+ 壁灯
  ================================================================ */
  {
    const root = new THREE.Group();
    // 三级台阶（150mm × 350mm）
    const st = [[8.375, 0.075, 0.15], [8.025, 0.15, 0.30], [7.675, 0.225, 0.45]];
    for (const [z, y, h] of st) {
      root.add(mesh(new THREE.BoxGeometry(2.8, h, 0.35), matConc(), -3.3, y, z));
    }
    // 门廊地台（0.45m，X -4.5→1.0，承接雨棚）
    root.add(mesh(new THREE.BoxGeometry(5.5, F1, 1.25), matConc(), -1.75, F1 / 2, 6.875));
    root.add(mesh(new THREE.BoxGeometry(5.5, 0.04, 1.25), M.plastic(0x8e9296, 0.85), -1.75, F1 - 0.02, 6.875));
    // 悬挑下方灰空间露台（抬高段 + 平铺段）
    root.add(mesh(new THREE.BoxGeometry(4.0, F1, 1.25), matConc(), 3.0, F1 / 2, 6.875));
    root.add(mesh(new THREE.BoxGeometry(4.0, 0.04, 1.25), M.plastic(0x8e9296, 0.85), 3.0, F1 - 0.02, 6.875));
    root.add(mesh(new THREE.BoxGeometry(2.5, 0.07, 1.9), matConc(), 6.25, 0.035, 6.95));
    // 两根矩形柱 + 悬挑雨棚（顶面即二层阳台地坪）
    for (const cx of [-4.32, 0.82]) {
      root.add(mesh(new THREE.BoxGeometry(0.35, 3.1, 0.35), matWhite(), cx, F1 + 1.55, 7.32));
      root.add(mesh(new THREE.BoxGeometry(0.44, 0.09, 0.44), matDark(), cx, F1 + 0.045, 7.32));
      root.add(mesh(new THREE.BoxGeometry(0.44, 0.09, 0.44), matDark(), cx, F1 + 3.06, 7.32));
    }
    root.add(mesh(new THREE.BoxGeometry(5.5, 0.25, 1.5), M.plastic(0xe6e2d8, 0.8), -1.75, 3.525, 6.75)); // 雨棚板
    root.add(mesh(new THREE.BoxGeometry(5.56, 0.3, 0.05), matDark(), -1.75, 3.52, 7.52));                // 檐口封板
    // 门侧壁灯 ×2（上下透光壁灯）
    for (const lx of [-4.72, -1.88]) {
      root.add(mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), matDark(), lx, F1 + 2.15, HZ + 0.06));
      root.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.11), lampMat(), lx, F1 + 2.32, HZ + 0.06));
      root.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.11), lampMat(), lx, F1 + 1.98, HZ + 0.06));
    }
    const pl = warmLight(-3.3, F1 + 2.3, 7.2, 9);
    root.add(pl);
    // 玄关吊灯
    root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), matDark(), -3.3, 3.2, 4.8));
    root.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 16, 1, true),
      M.metal(0x30363d, 0.4, 0.7, { side: THREE.DoubleSide }), -3.3, 2.88, 4.8));
    root.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), lampMat(), -3.3, 2.82, 4.8));
    root.add(warmLight(-3.3, 2.75, 4.8, 7));
    addEdges(root, 40);
    P(root, { name: '门廊台阶与雨棚', en: 'Porch, Canopy & Lamps', role: 'structure',
      desc: '三级 150mm 台阶满足舒适踏步尺度，两根 350mm 方柱支撑 250 厚悬挑雨棚板，棚顶即二层阳台地坪；上下透光壁灯为夜间入户提供低位照明。' },
      [0.2, 0.05, 0.6]);
  }

  /* ================================================================
     9. 二层阳台与玻璃栏杆（主卧外挑，立于雨棚顶）
  ================================================================ */
  {
    const root = new THREE.Group();
    // 防腐木地板（雨棚顶面 3.65 起铺）
    for (let i = 0; i < 6; i++) {
      root.add(mesh(new THREE.BoxGeometry(5.5, 0.028, 0.24), matWood(0x9a7a54, 0.75),
        -1.75, 3.664, 6.13 + i * 0.25));
    }
    // 玻璃栏杆：前缘 Z=7.5 与西侧 X=-4.5
    const rail = (len, x, z, alongX) => {
      const g = new THREE.Group();
      const n = Math.max(1, Math.round(len / 1.4));
      for (let i = 0; i <= n; i++) {
        const px = alongX ? -len / 2 + i * len / n : 0;
        const pz = alongX ? 0 : -len / 2 + i * len / n;
        g.add(mesh(new THREE.BoxGeometry(0.05, 1.05, 0.05), matSteel(), px, 3.678 + 0.525, pz));
      }
      for (let i = 0; i < n; i++) {
        const cx = alongX ? -len / 2 + (i + 0.5) * len / n : 0;
        const cz = alongX ? 0 : -len / 2 + (i + 0.5) * len / n;
        const pane = mesh(new THREE.BoxGeometry(alongX ? len / n - 0.05 : 0.012, 0.92, alongX ? 0.012 : len / n - 0.05),
          glassMat(0xcfe2ee, 0.34), cx, 3.678 + 0.55, cz);
        pane.userData.noEdges = true;
        g.add(pane);
      }
      g.add(mesh(new THREE.BoxGeometry(alongX ? len : 0.06, 0.05, alongX ? 0.06 : len), matDark(),
        0, 3.678 + 1.06, 0));
      g.position.set(x, 0, z);
      return g;
    };
    root.add(rail(5.5, -1.75, 7.5, true));    // 前缘
    root.add(rail(1.5, -4.5, 6.75, false));   // 西缘
    addEdges(root, 40);
    P(root, { name: '二层阳台与玻璃栏杆', en: 'Balcony & Glass Railing', role: 'shell',
      desc: '主卧外挑阳台立于门廊雨棚顶，69mm 预制格栅板找坡排水；12mm 钢化夹胶玻璃栏板高 1.05m，不锈钢立柱栏杆满足 1.0kN/m 侧向荷载。' },
      [0, 0.75, 0.4]);
  }

  /* ================================================================
     10. 附属车库（单层，净高 3m，内含工作台）
  ================================================================ */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(4.1, 0.05, 5.7), M.plastic(0x9b9e99, 0.9), -9.7, 0.025, 1.9)); // 地坪
    root.add(mesh(new THREE.BoxGeometry(0.24, 3.25, 6.24), matWall(), -11.58, 1.625, 2.0));            // 西墙
    const gF = wallMesh(4.44, 3.25, T, [{ x: 0, w: 3.0, y0: 0, y1: 2.4 }]);                            // 前墙（卷帘门洞）
    gF.position.set(-9.6, 0, 5 - T / 2);
    root.add(gF);
    root.add(mesh(new THREE.BoxGeometry(4.44, 3.25, T), matWall(), -9.6, 1.625, -1.0 - T / 2));        // 后墙
    // 车库平屋顶 + 女儿墙
    root.add(mesh(new THREE.BoxGeometry(4.6, 0.2, 6.7), matDark(), -9.6, 3.35, 2.0));
    for (const [w, d, x, z] of [[4.6, 0.15, -9.6, 5.35], [0.15, 6.7, -11.9, 2.0], [4.6, 0.15, -9.6, -1.35]]) {
      root.add(mesh(new THREE.BoxGeometry(w, 0.4, d), matWall(), x, 3.65, z));
      root.add(mesh(new THREE.BoxGeometry(w + 0.05, 0.06, d + 0.05), matDark(), x, 3.88, z));
    }
    // 内部：工作台 + 墙挂置物架
    root.add(mesh(new THREE.BoxGeometry(1.7, 0.05, 0.55), matWood(0x8a6a48, 0.7), -9.6, 0.95, -0.75));
    for (const dx of [-0.75, 0.75]) for (const dz of [-0.2, 0.2]) {
      root.add(mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), matDark(), -9.6 + dx, 0.475, -0.75 + dz));
    }
    root.add(mesh(new THREE.BoxGeometry(1.7, 0.6, 0.03), matWood(0x7a5c3e, 0.7), -9.6, 1.35, -1.0));
    root.add(mesh(new THREE.BoxGeometry(1.6, 0.04, 0.3), matDark(), -9.6, 1.9, -0.9));
    addEdges(root, 40);
    P(root, { name: '附属车库', en: 'Attached Garage', role: 'shell',
      desc: '单层附属车库 4.2×6.0m，室内净高 3.0m 满足 SUV 加车顶架通行；屋面与主体挑檐衔接，前墙预留 3.0m 宽卷帘门洞并设混凝土反坎。' },
      [-0.5, 0.2, -0.3]);
  }

  /* ================================================================
     11. 车库卷帘门（分段上卷模拟，参数 0-100%）
  ================================================================ */
  {
    const root = new THREE.Group();
    const sm = M.plastic(0x4a5057, 0.55);
    const SH_H = refs.SH_H, SLAT = refs.SLAT, N = 21;
    for (let j = 0; j < N; j++) {
      const s = mesh(new THREE.BoxGeometry(2.98, SLAT * 0.96, 0.045), sm, -9.6, (j + 0.5) * SLAT, 4.92);
      s.userData.y0 = (j + 0.5) * SLAT;
      s.userData.noEdges = true;
      refs.slats.push(s);
      root.add(s);
    }
    // 导轨 + 卷轴罩 + 卷轴
    for (const gx of [-11.14, -8.06]) {
      root.add(mesh(new THREE.BoxGeometry(0.07, 2.5, 0.08), matDark(), gx, 1.25, 4.98));
    }
    root.add(mesh(new THREE.BoxGeometry(3.24, 0.44, 0.3), matDark(), -9.6, 2.62, 4.9));
    const spin = new THREE.Group();
    const roll = mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.05, 16), M.metal(0x8a929c, 0.45, 0.8));
    roll.rotation.z = Math.PI / 2;
    spin.add(roll);
    spin.position.set(-9.6, 2.6, 4.9);
    refs.rollSpin = spin;
    root.add(spin);
    addEdges(root, 40);
    P(root, { name: '车库卷帘门', en: 'Roller Shutter', role: 'core',
      desc: '电动卷帘门由 21 片 55mm 钢质帘板铰接而成，管状电机驱动卷轴收卷，行程 2.4m 约 12 秒；底部设红外防夹与停电手摇释放。' },
      [0, 0.35, 0.6]);
  }

  /* ================================================================
     12. 室内楼梯（直跑 18 步 + 双侧扶手 + 井口护栏）
  ================================================================ */
  {
    const root = new THREE.Group();
    const N = 18, rise = (L2F - F1 + 0.02) / N, tread = 0.31;
    for (let i = 0; i < N; i++) {
      const h = (i + 1) * rise;
      root.add(mesh(new THREE.BoxGeometry(1.2, h, tread), matWood(0x9a744c, 0.68),
        -4.9, F1 + h / 2, 4.85 - i * tread));
    }
    // 斜梁侧板
    const run = (N - 1) * tread, ang = Math.atan2(N * rise, run);
    for (const sx of [-5.52, -4.28]) {
      const beam = mesh(new THREE.BoxGeometry(0.05, 0.32, Math.hypot(run, N * rise) + 0.2), matWood(0x7a5c3e, 0.7),
        sx, F1 + N * rise / 2, 4.85 - run / 2);
      beam.rotation.x = -ang;
      root.add(beam);
    }
    // 扶手（东侧开放边）+ 栏杆柱
    const railLen = Math.hypot(run, N * rise);
    const hand = mesh(new THREE.BoxGeometry(0.05, 0.06, railLen), matWood(0x6e4a30, 0.55),
      -4.26, F1 + N * rise / 2 + 0.86, 4.85 - run / 2);
    hand.rotation.x = -ang;
    root.add(hand);
    for (let i = 0; i <= 6; i++) {
      const t2 = i / 6;
      root.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.86, 8), matSteel(),
        -4.26, F1 + t2 * N * rise + 0.43, 4.85 - t2 * run));
    }
    // 楼梯井口 L2 护栏
    root.add(mesh(new THREE.BoxGeometry(1.44, 0.05, 0.05), matWood(0x6e4a30, 0.55), -4.9, L2F + 1.0, -0.24));
    for (const bx of [-5.5, -4.3]) {
      root.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), matSteel(), bx, L2F + 0.5, -0.24));
    }
    root.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 1.5), matWood(0x6e4a30, 0.55), -5.56, L2F + 1.0, -0.95));
    root.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), matSteel(), -5.56, L2F + 0.5, -0.24));
    root.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), matSteel(), -5.56, L2F + 0.5, -1.66));
    addEdges(root, 40);
    P(root, { name: '室内楼梯', en: 'Interior Stair', role: 'structure',
      desc: '直跑钢木楼梯共 18 步，踏步 310×178mm 符合 2h+b≈620mm 舒适公式；梯井周边护栏净高 1.0m，梯段净宽 1.2m 满足疏散要求。' },
      [0.35, 0.4, 0]);
  }

  /* ================================================================
     13. 泳池结构（8 × 4m，池体 + 马赛克池壁）
  ================================================================ */
  {
    const root = new THREE.Group();
    const plaster = M.plastic(0xddeef2, 0.7);
    // 池壁（内净 8 × 4，深 1.5m）
    for (const [w, d, x, z] of [
      [8.3, 0.15, 4.5, 13.275], [8.3, 0.15, 4.5, 9.125],
      [0.15, 4.3, 0.425, 11.2], [0.15, 4.3, 8.575, 11.2]
    ]) {
      root.add(mesh(new THREE.BoxGeometry(w, 1.45, d), plaster, x, -0.775, z));
    }
    root.add(mesh(new THREE.BoxGeometry(8.3, 0.08, 4.3), plaster, 4.5, -1.46, 11.2));   // 池底
    // 池沿压顶石
    for (const [w, d, x, z] of [
      [8.4, 0.2, 4.5, 13.3], [8.4, 0.2, 4.5, 9.1],
      [0.2, 4.4, 0.4, 11.2], [0.2, 4.4, 8.6, 11.2]
    ]) {
      root.add(mesh(new THREE.BoxGeometry(w, 0.14, d), M.plastic(0xcfd3d6, 0.8), x, 0.02, z));
    }
    addEdges(root, 40);
    P(root, { name: '泳池结构', en: 'Pool Structure', role: 'structure',
      desc: '8×4m 钢筋混凝土泳池，池壁内壁防水砂浆压光后铺浅色面层，水深约 1.2m；四周花岗岩压顶石向池内找坡 1%，防止雨水回流污染池水。' },
      [0.35, -0.15, 0.5]);
  }

  /* ================================================================
     14. 泳池水、扶梯与池底灯（参数/夜间点亮）
  ================================================================ */
  {
    const root = new THREE.Group();
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x2f9fc4, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.62,
      emissive: 0x1899b8, emissiveIntensity: 0.04, side: THREE.DoubleSide
    });
    refs.waterMat = waterMat;
    const water = mesh(new THREE.BoxGeometry(8.0, 0.05, 4.0), waterMat, 4.5, refs.waterY, 11.2);
    water.userData.noEdges = true;
    water.castShadow = false;
    refs.water = water;
    root.add(water);
    // 不锈钢扶梯
    const rung = (z) => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), matSteel(), 8.55, 0, z);
    for (const yy of [-0.35, -0.7, -1.05]) {
      const r = rung(10.45); r.position.y = yy; r.rotation.x = Math.PI / 2;
      r.userData.noEdges = true;
      root.add(r);
    }
    for (const z of [10.2, 10.7]) {
      root.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 8), matSteel(), 8.62, -0.35, z));
      const bend = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8), matSteel(), 8.44, 0.36, z);
      bend.rotation.z = 1.25;
      root.add(bend);
    }
    // 池底灯 ×2 + 水下泛光
    const discMat = M.emis(0x35e0d0, 0.12, { color: 0x0d3a3a });
    refs.poolDiscMat = discMat;
    for (const [x, z] of [[3.0, 10.2], [6.0, 12.2]]) {
      const d = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), discMat, x, -1.4, z);
      d.userData.noEdges = true;
      root.add(d);
      const l = new THREE.PointLight(0x2fd8c8, 0, 7, 1.6);
      l.position.set(x, -0.8, z);
      refs.poolLights.push(l);
      root.add(l);
    }
    addEdges(root, 40);
    P(root, { name: '泳池水与扶梯', en: 'Pool Water & Ladder', role: 'core',
      desc: '池水经砂缸过滤循环并投氯消毒，水面下 300mm 设溢流接口维持恒水位；304 不锈钢扶梯三步入水，池底双灯为夜间提供水下照明。' },
      [0, 0.2, 0.35]);
  }

  /* ================================================================
     15. 池畔木平台（四面收边 + 板缝）
  ================================================================ */
  {
    const root = new THREE.Group();
    const wm = matWood(0x9a7a54, 0.75);
    // 四条收边（含龙基层，留出泳池开口）
    for (const [w, d, x, z] of [
      [1.2, 5.5, 0.0, 10.65], [1.2, 5.5, 9.0, 10.65],
      [7.8, 1.3, 4.5, 8.55], [7.8, 0.35, 4.5, 13.22]
    ]) {
      root.add(mesh(new THREE.BoxGeometry(w, 0.15, d), wm, x, -0.015, z));
    }
    // 板缝线（南侧活动区加密）
    for (let i = 0; i < 9; i++) {
      root.add(mesh(new THREE.BoxGeometry(7.7, 0.155, 0.018), matDark(), 4.5, -0.015, 8.0 + i * 0.14));
    }
    addEdges(root, 40);
    P(root, { name: '池畔木平台', en: 'Pool Deck', role: 'structure',
      desc: '防腐碳化木平台架空 90mm 铺装，板下龙骨调坡排水防止积水；平台边缘做 45° 倒角收边，与泳池压顶石之间留伸缩缝。' },
      [0, 0.12, 0.6]);
  }

  /* ================================================================
     16. 户外家具与淋浴（躺椅×2 / 遮阳伞 / 灰空间桌凳 / 淋浴）
  ================================================================ */
  {
    const root = new THREE.Group();
    // 躺椅 ×2（靠背可调角度造型）
    const lounger = (x) => {
      const g = new THREE.Group();
      const cushion = M.plastic(0xe3e0d8, 0.85), frame = M.metal(0x8b939c, 0.4, 0.8);
      g.add(mesh(new THREE.BoxGeometry(1.32, 0.09, 0.62), cushion, 0.29, 0.32, 0));
      const back = mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), cushion, -0.52, 0.52, 0);
      back.rotation.z = 0.95;
      g.add(back);
      g.add(mesh(new THREE.BoxGeometry(1.9, 0.05, 0.58), frame, 0, 0.22, 0));
      for (const dx of [-0.8, 0.8]) for (const dz of [-0.24, 0.24]) {
        g.add(mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), frame, dx, 0.1, dz));
      }
      g.add(mesh(new THREE.BoxGeometry(0.28, 0.07, 0.5), cushion, 0.6, 0.42, 0)); // 脚踏垫
      g.position.set(x, 0.06, 8.55);
      return g;
    };
    root.add(lounger(2.5), lounger(4.4));
    // 遮阳伞（十棱伞面，立于两张躺椅之间）
    root.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 12), matDark(), 3.45, 0.1, 8.55));
    root.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.2, 10), M.metal(0x9aa2ab, 0.4, 0.8), 3.45, 1.2, 8.55));
    root.add(mesh(new THREE.ConeGeometry(1.35, 0.45, 10, 1, true),
      M.plastic(0xd7dbe0, 0.7, { side: THREE.DoubleSide }), 3.45, 2.25, 8.55));
    root.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), matDark(), 3.45, 2.5, 8.55));
    // 灰空间：户外矮桌与凳（抬高露台 0.45 之上）
    root.add(mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.04, 16), matWood(0x8a6a48, 0.7), 3.0, 0.79, 6.85));
    root.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.32, 10), matDark(), 3.0, 0.61, 6.85));
    for (const sx of [2.3, 3.7]) {
      root.add(mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), matWood(0x8a6a48, 0.7), sx, 0.89, 6.85));
      for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) {
        root.add(mesh(new THREE.BoxGeometry(0.035, 0.42, 0.035), matDark(), sx + dx, 0.66, 6.85 + dz));
      }
    }
    // 户外淋浴（泳池旁）：木踏板 + 立管 + 花洒
    for (let i = 0; i < 4; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.62, 0.035, 0.13), matWood(0x8a6a48, 0.75), 9.05, 0.09, 12.62 + i * 0.16));
    }
    root.add(mesh(new THREE.CylinderGeometry(0.024, 0.028, 2.1, 10), M.chrome(0xcfd6dd), 9.3, 1.15, 12.95));
    const arm = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), M.chrome(0xcfd6dd), 9.17, 2.16, 12.95);
    arm.rotation.z = Math.PI / 2 - 0.25;
    root.add(arm);
    root.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.045, 14), M.metal(0xb9c2cc, 0.35, 0.85), 9.02, 2.12, 12.95));
    root.add(mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), matDark(), 9.34, 1.1, 12.98));
    addEdges(root, 40);
    P(root, { name: '户外家具与淋浴', en: 'Outdoor Furniture & Shower', role: 'internal',
      desc: '泳池区按休闲动线布置：两张可调躺椅面向南向日照，十棱遮阳伞投影覆盖休憩区；户外淋浴供入池前冲淋，木踏板下方直排卵石渗水层。' },
      [0.25, 0.3, 0.7]);
  }

  /* ================================================================
     17. 庭院草坪与铺装（车道 / 步道 / 后院地坪，微起伏）
  ================================================================ */
  {
    const root = new THREE.Group();
    const gm = grassMat();
    // 三块草坪围绕泳池平台留洞（X -0.6→9.6, Z 7.9→13.4）
    const lawn = (w, d, x, z, sx, sz) => {
      const geo = new THREE.BoxGeometry(w, 0.08, d, sx, 1, sz);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) > 0) {
          const vx = pos.getX(i), vz = pos.getZ(i);
          pos.setY(i, 0.04 + (Math.sin(vx * 1.7 + vz * 2.3) + 0.6 * Math.sin(vx * 0.9 - vz * 1.3)) * 0.016);
        }
      }
      geo.computeVertexNormals();
      const m = mesh(geo, gm, x, -0.04, z);
      m.receiveShadow = true;
      return m;
    };
    root.add(lawn(26.5, 17.9, -1.25, -1.05, 26, 18));
    root.add(lawn(13.9, 6.1, -7.55, 10.95, 14, 6));
    root.add(lawn(2.4, 6.1, 10.8, 10.95, 4, 6));
    // 混凝土车道（车库门前 → 场地边界大门）
    root.add(mesh(new THREE.BoxGeometry(3.6, 0.09, 9.0), matConc(), -10.3, 0.045, 9.5));
    root.add(mesh(new THREE.BoxGeometry(3.66, 0.02, 0.06), matDark(), -10.3, 0.092, 9.5)); // 分缝线
    // 入户步道
    root.add(mesh(new THREE.BoxGeometry(1.4, 0.09, 5.05), matConc(), -3.3, 0.045, 11.08));
    // 后院地坪（餐厅推拉门外）
    root.add(mesh(new THREE.BoxGeometry(2.6, 0.07, 1.0), matConc(), 3.4, 0.035, -6.5));
    addEdges(root, 40);
    P(root, { name: '庭院草坪与铺装', en: 'Lawn & Paving', role: 'structure',
      desc: '庭草地基为 100mm 种植土下铺排水盲沟，草坪微地形起伏引导雨水流向泳池侧明沟；车道为 150mm 厚商品混凝土面层，每 3m 设缩缝。' },
      [0, -0.5, 0]);
  }

  /* ================================================================
     18. 乔木 ×2（树干 + 球形树冠组）
  ================================================================ */
  {
    const root = new THREE.Group();
    const tree = (x, z, s) => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.11 * s, 0.17 * s, 2.4 * s, 10), matWood(0x6b4a34, 0.85), 0, 1.2 * s, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 1.1 * s, 8), matWood(0x6b4a34, 0.85),
        0.28 * s, 2.5 * s, 0.1 * s));
      const crowns = [
        [0, 2.75 * s, 0, 1.35 * s, 0x4d7c44],
        [0.75 * s, 2.35 * s, 0.3 * s, 0.95 * s, 0x588c4b],
        [-0.65 * s, 2.45 * s, -0.3 * s, 0.9 * s, 0x477540]
      ];
      for (const [cx, cy, cz, r, c] of crowns) {
        const m = mesh(new THREE.IcosahedronGeometry(r, 1), M.plastic(c, 0.9), cx, cy, cz);
        m.userData.noEdges = true;
        g.add(m);
      }
      g.position.set(x, 0, z);
      return g;
    };
    root.add(tree(-13.0, 7.2, 1.15), tree(10.7, 2.4, 0.95));
    addEdges(root, 45);
    P(root, { name: '庭院乔木 ×2', en: 'Courtyard Trees', role: 'internal',
      desc: '西植冠幅较大的重阳木遮蔽西晒，东南角植丛生朴树软化车库车道转角；乔木距外墙 3m 以上，避免根系破坏基础与管道。' },
      [0.4, 0.6, 0.3]);
  }

  /* ================================================================
     19. 绿篱与灌木（西界绿篱带 + 车道绿化带 + 门廊盆栽）
  ================================================================ */
  {
    const root = new THREE.Group();
    const hm = M.plastic(0x4f7c44, 0.9);
    for (let i = 0; i < 19; i++) {           // 西界绿篱
      const s = 1 + ((i % 3) - 1) * 0.06;
      const m = mesh(new THREE.BoxGeometry(0.9 * s, 0.82, 1.0 * s), hm, -14.1, 0.41, -8.6 + i * 1.2);
      m.userData.noEdges = true;
      root.add(m);
    }
    for (let i = 0; i < 5; i++) {            // 车道与主体间绿化带
      const m = mesh(new THREE.BoxGeometry(0.75, 0.7, 0.75), hm, -8.05, 0.35, 6.6 + i * 1.65);
      m.userData.noEdges = true;
      root.add(m);
    }
    // 门廊盆栽 ×2
    const pot = (x, y, z) => {
      root.add(mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 14), M.plastic(0x8a8578, 0.85), x, y + 0.21, z));
      const b = mesh(new THREE.IcosahedronGeometry(0.32, 1), hm, x, y + 0.68, z);
      b.userData.noEdges = true;
      root.add(b);
    };
    pot(-1.35, F1, 6.6);
    pot(-5.15, 0, 6.6);
    addEdges(root, 45);
    P(root, { name: '绿篱与灌木', en: 'Hedge & Shrubs', role: 'internal',
      desc: '西界植 1.9m 高大叶黄杨绿篱带屏蔽北侧道路视线，车库车道与主体间 1.2m 绿化带种植耐践踏灌木并兼作安全缓冲；门廊陶盆月季点景入户。' },
      [-0.25, 0.25, 0.7]);
  }

  /* ================================================================
     20. 庭院围墙与电动平移大门（1.8m，白墙深灰压顶）
  ================================================================ */
  {
    const root = new THREE.Group();
    const wall = (len, x, z, alongX = true) => {
      const w = alongX ? len : 0.15, d = alongX ? 0.15 : len;
      root.add(mesh(new THREE.BoxGeometry(w, 1.85, d), matWall(), x, 0.875, z));
      root.add(mesh(new THREE.BoxGeometry(w + (alongX ? 0.06 : 0.1), 0.1, d + (alongX ? 0.1 : 0.06)),
        matDark(), x, 1.85, z));
    };
    wall(1.95, -13.5, 14);            // 前墙西段（至门柱）
    wall(20.1, 1.95, 14);             // 前墙东段（门柱 → 东南角）
    wall(26.5, -1.25, -10);           // 后墙
    wall(24, 12, 2, false);           // 东墙
    wall(24, -14.5, 2, false);        // 西墙
    // 大门轨道
    root.add(mesh(new THREE.BoxGeometry(8.2, 0.05, 0.07), matDark(), -8.0, 0.025, 13.9));
    // 电动平移大门（参数驱动，关闭位于车道门洞）
    const gate = new THREE.Group();
    const gm2 = matDark();
    gate.add(mesh(new THREE.BoxGeometry(3.9, 0.1, 0.08), gm2, 0, 0.14, 0));
    gate.add(mesh(new THREE.BoxGeometry(3.9, 0.1, 0.08), gm2, 0, 1.74, 0));
    for (const sx of [-1.91, 1.91]) {
      gate.add(mesh(new THREE.BoxGeometry(0.09, 1.7, 0.08), gm2, sx, 0.94, 0));
    }
    for (let i = 0; i < 5; i++) {
      const s = mesh(new THREE.BoxGeometry(3.72, 0.22, 0.05), M.plastic(0x565d66, 0.6), 0, 0.35 + i * 0.32, 0);
      s.userData.noEdges = true;
      gate.add(s);
    }
    for (const wx of [-1.5, 1.5]) {
      const w = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), matSteel(), wx, 0.06, 0);
      w.rotation.x = Math.PI / 2;
      gate.add(w);
    }
    gate.position.set(refs.GATE_X, 0, 13.9);
    refs.gate = gate;
    root.add(gate);
    addEdges(root, 40);
    P(root, { name: '围墙与电动平移门', en: 'Perimeter Wall & Sliding Gate', role: 'shell',
      desc: '1.8m 实心围墙抑制临街视线与噪声，顶部深灰压顶内敷泛水；4m 电动平移门采用悬臂轮无底轨设计，遇阻反弹并支持 app 遥控。' },
      [-0.35, 0.35, 0.8]);
  }

  /* ================================================================
     21. 门柱与信箱
  ================================================================ */
  {
    const root = new THREE.Group();
    for (const px of [-12.35, -7.875]) {
      root.add(mesh(new THREE.BoxGeometry(0.45, 2.3, 0.45), matWhite(), px, 1.15, 14));
      root.add(mesh(new THREE.BoxGeometry(0.56, 0.09, 0.56), matDark(), px, 2.34, 14));
      root.add(mesh(new THREE.BoxGeometry(0.1, 0.14, 0.02), lampMat(0xffe6bb), px, 1.9, 13.76));
    }
    // 信箱（东门柱旁立柱式）
    root.add(mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), matDark(), -7.35, 0.525, 13.55));
    root.add(mesh(new THREE.BoxGeometry(0.46, 0.28, 0.32), M.plastic(0x3f454d, 0.6), -7.35, 1.2, 13.55));
    root.add(mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), matSteel(), -7.35, 1.32, 13.38));
    root.add(mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), M.paint(0xc4372f), -7.16, 1.38, 13.4));
    addEdges(root, 40);
    P(root, { name: '门柱与信箱', en: 'Gate Posts & Mailbox', role: 'internal',
      desc: '门柱高出墙顶 500mm 强化入口序列感，柱身嵌入低位壁灯为夜间归家照明；立柱式信箱带防雨投递口与红色取信旗。' },
      [-0.5, 0.2, 0.8]);
  }

  /* ================================================================
     22. 空调外机 ×2（东墙 + 格栅罩 + 支架）
  ================================================================ */
  {
    const root = new THREE.Group();
    const unit = (z) => {
      root.add(mesh(new THREE.BoxGeometry(0.36, 0.64, 0.92), M.plastic(0xd8dadc, 0.5), 7.69, 1.62, z));
      // 顶部风扇格栅
      const ring = mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 24), M.plastic(0x9aa0a6, 0.5), 7.69, 1.945, z);
      ring.rotation.x = Math.PI / 2;
      ring.userData.noEdges = true;
      root.add(ring);
      for (let i = 0; i < 4; i++) {
        const sp = mesh(new THREE.BoxGeometry(0.015, 0.012, 0.36), M.plastic(0x9aa0a6, 0.5),
          7.69, 1.945, z);
        sp.rotation.y = i * Math.PI / 4;
        sp.userData.noEdges = true;
        root.add(sp);
      }
      // 侧面出风格栅罩
      for (let i = 0; i < 6; i++) {
        root.add(mesh(new THREE.BoxGeometry(0.02, 0.06, 0.8), M.plastic(0x9aa0a6, 0.55),
          7.875, 1.36 + i * 0.1, z));
      }
      // 支架 + 冷凝水管
      root.add(mesh(new THREE.BoxGeometry(0.34, 0.05, 0.9), M.metal(0x6a7076, 0.5, 0.7), 7.66, 1.26, z));
      root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 6), matSteel(), 7.9, 0.7, z + 0.5));
    };
    unit(-2.6);
    unit(-1.2);
    addEdges(root, 40);
    P(root, { name: '空调外机 ×2', en: 'AC Condensing Units', role: 'internal',
      desc: '两台一拖多变频外机挂于东墙背阴面，金属格栅罩保证检修与通风；冷凝水有组织排至地面明沟，支架预留减振橡胶垫。' },
      [0.5, 0.1, 0]);
  }

  /* ================================================================
     23. 屋顶太阳能板阵列（5 块 12° 倾斜深蓝面板）
  ================================================================ */
  {
    const root = new THREE.Group();
    const panel = (x) => {
      const g = new THREE.Group();
      const body = mesh(new THREE.BoxGeometry(1.7, 0.05, 1.12), M.metal(0x17335e, 0.35, 0.6), 0, 0, 0);
      body.rotation.x = 0.21;
      g.add(body);
      for (const dz of [-0.56, 0.56]) {
        g.add(mesh(new THREE.BoxGeometry(1.74, 0.03, 0.03), M.brushed(0xb9c3cd), 0, 0.02, dz));
      }
      for (const dx of [-0.85, 0.85]) {
        g.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 1.16), M.brushed(0xb9c3cd), dx, 0.02, 0));
      }
      // 三角支架（自屋面 6.70 至板底）
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.37, 0.05), M.metal(0x8a929c, 0.45, 0.8), 0, -0.095, -0.42));
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), M.metal(0x8a929c, 0.45, 0.8), 0, -0.21, 0.42));
      g.position.set(x, ROOF1 + 0.28, -3.4);
      return g;
    };
    for (let i = 0; i < 5; i++) root.add(panel(-5.6 + i * 2.8));
    addEdges(root, 40);
    P(root, { name: '屋顶太阳能阵列', en: 'Rooftop Solar Array', role: 'core',
      desc: '5 块 445W 单晶硅组件朝南 12° 铺设，年发电约 9000kWh 供全宅使用；支架为阳极氧化铝导轨夹具，不穿透防水层。' },
      [0, 0.95, -0.3]);
  }

  /* ================================================================
     24. 檐槽与落水管（有组织排水）
  ================================================================ */
  {
    const root = new THREE.Group();
    const gm3 = M.metal(0x5f676f, 0.5, 0.75);
    for (const [len, x, z] of [[9.3, -3.55, 6.68], [7.3, 4.55, 8.18], [16.3, 0, -6.68]]) {
      root.add(mesh(new THREE.BoxGeometry(len, 0.14, 0.18), gm3, x, 6.44, z));
    }
    root.add(mesh(new THREE.BoxGeometry(4.7, 0.12, 0.16), gm3, -9.6, 3.22, 5.28)); // 车库檐槽
    const pipe = (x, z, h, r = 0.045) => {
      const p = mesh(new THREE.CylinderGeometry(r, r, h, 10), gm3, x, h / 2 + 0.1, z);
      p.userData.noEdges = true;
      root.add(p);
      root.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.16), gm3, x, 0.08, z)); // 水箅
    };
    pipe(-7.95, 6.66, 6.34);
    pipe(7.95, 8.1, 6.34);
    pipe(7.95, -6.6, 6.34);
    pipe(-11.6, 5.24, 3.05, 0.04);
    addEdges(root, 40);
    P(root, { name: '檐槽与落水管', en: 'Gutters & Downpipes', role: 'internal',
      desc: '屋面雨水经金属檐槽汇流至三处 DN75 落水管有组织排放，底部接庭院雨水明沟；车库屋面独立设排水，全部金属件热镀锌防锈。' },
      [0, 0.7, 0.6]);
  }

  /* ================================================================
     25. 庭院草坪灯 ×4（夜间自动点亮）
  ================================================================ */
  {
    const root = new THREE.Group();
    const bandMat = () => {
      const m = M.emis(0xffe2b0, 0.06, { color: 0xfff3dd });
      refs.courtMats.push(m);
      return m;
    };
    for (const [x, z] of [[-4.5, 9.8], [-2.1, 9.8], [-1.2, 12.6], [10.3, 9.0]]) {
      root.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.55, 12), matDark(), x, 0.275, z));
      root.add(mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.16, 12), bandMat(), x, 0.4, z));
      root.add(mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.04, 12), matDark(), x, 0.585, z));
      const l = new THREE.PointLight(0xffdfae, 0, 5.5, 1.8);
      l.position.set(x, 0.5, z);
      refs.courtLights.push(l);
      root.add(l);
    }
    addEdges(root, 40);
    P(root, { name: '庭院草坪灯 ×4', en: 'Garden Bollard Lights', role: 'core',
      desc: '3000K 低位草坪灯沿入户动线与泳池边缘布置，照度均匀不眩光；光控+时控模块使灯具在夜间自动点亮、白天自动熄灭。' },
      [-0.3, 0.3, 0.6]);
  }

  /* ================================================================
     26. 客厅家具（沙发 / 茶几 / 电视墙 / 地毯 / 吊灯）
  ================================================================ */
  {
    const root = new THREE.Group();
    const fabric = (c) => M.plastic(c, 0.88);
    // 电视墙（东墙，落地木饰面）
    root.add(mesh(new THREE.BoxGeometry(0.05, 2.3, 3.2), matWood(0x4e3a2a, 0.65), 7.22, F1 + 1.15, 3.0));
    refs.tvMat = M.emis(0x3a6fd8, 0.35, { color: 0x0a0d12 });
    root.add(mesh(new THREE.BoxGeometry(0.03, 0.85, 1.5), refs.tvMat, 7.17, F1 + 1.85, 3.0));
    root.add(mesh(new THREE.BoxGeometry(0.42, 0.45, 1.9), matWood(0x5a4432, 0.65), 7.02, F1 + 0.685, 3.0));
    // 地毯
    root.add(mesh(new THREE.BoxGeometry(3.2, 0.02, 2.8), fabric(0x8b8378), 5.5, F1 + 0.035, 3.0));
    // 沙发（面向电视墙）
    root.add(mesh(new THREE.BoxGeometry(0.95, 0.42, 2.4), fabric(0x52637a), 4.35, F1 + 0.66, 3.0));
    root.add(mesh(new THREE.BoxGeometry(0.22, 0.6, 2.4), fabric(0x5a6d88), 3.99, F1 + 0.76, 3.0));
    for (let i = 0; i < 3; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.85, 0.16, 0.72), fabric(0x637793), 4.42, F1 + 0.95, 2.0 + i * 0.8));
    }
    for (const dz of [-1.2, 1.2]) {
      root.add(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.18), fabric(0x5a6d88), 4.35, F1 + 0.87, 3.0 + dz));
    }
    // 茶几
    root.add(mesh(new THREE.BoxGeometry(1.15, 0.04, 0.6), M.metal(0x2e343b, 0.4, 0.7), 5.75, F1 + 0.86, 3.0));
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.24, 0.24]) {
      root.add(mesh(new THREE.BoxGeometry(0.05, 0.84, 0.05), matDark(), 5.75 + dx, F1 + 0.44, 3.0 + dz));
    }
    root.add(mesh(new THREE.BoxGeometry(0.3, 0.02, 0.3), matWood(0x8a6a48, 0.6), 5.75, F1 + 0.9, 3.0));
    // 客厅吊灯
    root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), matDark(), 5.75, 3.05, 3.0));
    root.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.18, 16, 1, true),
      M.metal(0x30363d, 0.4, 0.7, { side: THREE.DoubleSide }), 5.75, 2.55, 3.0));
    root.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), lampMat(), 5.75, 2.48, 3.0));
    root.add(warmLight(5.6, 2.5, 3.0, 11));
    addEdges(root, 40);
    P(root, { name: '客厅家具', en: 'Living Room Furniture', role: 'internal',
      desc: '三人位布艺沙发坐高 420mm，与 400mm 岩板茶几形成 30cm 视差；65 寸电视挂于木饰面背景墙，视距 3m 符合观影几何。' },
      [0.4, 0.25, 0.4]);
  }

  /* ================================================================
     27. 餐厅桌椅（6 人长桌 + 线性吊灯）
  ================================================================ */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(2.0, 0.05, 0.95), matWood(0x8a6a48, 0.65), 4.0, F1 + 0.725, -3.6));
    for (const dx of [-0.85, 0.85]) for (const dz of [-0.36, 0.36]) {
      root.add(mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), matWood(0x6e4a30, 0.65), 4.0 + dx, F1 + 0.36, -3.6 + dz));
    }
    const chair = (x, z, ry) => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), matWood(0x8a6a48, 0.7), 0, F1 + 0.46, 0));
      g.add(mesh(new THREE.BoxGeometry(0.44, 0.5, 0.05), matWood(0x7a5c3e, 0.7), 0, F1 + 0.72, -0.2));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.44, 0.06), matDark(), 0, F1 + 0.22, 0));
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      return g;
    };
    root.add(chair(3.3, -2.85, Math.PI), chair(4.7, -2.85, Math.PI));
    root.add(chair(3.3, -4.35, 0), chair(4.7, -4.35, 0));
    root.add(chair(2.6, -3.6, -Math.PI / 2), chair(5.4, -3.6, Math.PI / 2));
    // 线性吊灯
    root.add(mesh(new THREE.BoxGeometry(1.2, 0.1, 0.16), matDark(), 4.0, 2.72, -3.6));
    for (const dx of [-0.4, 0.4]) {
      root.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6), matDark(), 4.0 + dx, 3.08, -3.6));
      root.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), lampMat(), 4.0 + dx, 2.63, -3.6));
    }
    root.add(warmLight(4.0, 2.6, -3.6, 9));
    addEdges(root, 40);
    P(root, { name: '餐厅桌椅', en: 'Dining Set', role: 'internal',
      desc: '2m 长实木餐桌配 6 椅，桌面高 750mm、椅面 460mm 符合人体工学；餐位每人占有宽度 600mm，线性吊灯距桌面 800mm 避免眩光。' },
      [0.4, 0.25, -0.4]);
  }

  /* ================================================================
     28. 开放式厨房（L 形台面 + 吊柜 + 岛台端冰箱）
  ================================================================ */
  {
    const root = new THREE.Group();
    const counter = M.plastic(0x3d434b, 0.6), top = M.plastic(0xd9d6cf, 0.45);
    // L 形地柜（沿后墙 + 西墙）
    root.add(mesh(new THREE.BoxGeometry(4.9, 0.8, 0.62), counter, -4.85, F1 + 0.51, -5.45));
    root.add(mesh(new THREE.BoxGeometry(4.94, 0.04, 0.66), top, -4.85, F1 + 0.93, -5.45));
    root.add(mesh(new THREE.BoxGeometry(4.9, 0.1, 0.5), M.plastic(0x23272e, 0.6), -4.85, F1 + 0.06, -5.5));
    root.add(mesh(new THREE.BoxGeometry(0.62, 0.8, 3.0), counter, -7.07, F1 + 0.51, -3.55));
    root.add(mesh(new THREE.BoxGeometry(0.66, 0.04, 3.04), top, -7.07, F1 + 0.93, -3.55));
    // 柜门缝
    for (let i = 0; i < 5; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.015, 0.6, 0.02), matDark(), -6.6 + i * 1.0, F1 + 0.55, -5.135));
    }
    // 灶台 +油烟机 + 水槽
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.17, 0.17]) {
      root.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.015, 14), M.plastic(0x15181c, 0.4),
        -5.55 + dx * 1.6, F1 + 0.955, -5.45 + dz));
    }
    root.add(mesh(new THREE.BoxGeometry(0.9, 0.06, 0.5), M.metal(0x9aa2ab, 0.35, 0.85), -5.55, 2.2, -5.5));
    root.add(mesh(new THREE.BoxGeometry(0.32, 0.75, 0.32), M.metal(0x9aa2ab, 0.35, 0.85), -5.55, 2.6, -5.5));
    root.add(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.4), M.plastic(0x2a2e34, 0.4), -7.07, F1 + 0.945, -3.0));
    root.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.25, 8), M.chrome(0xd9dfe7), -7.07, F1 + 1.08, -3.25));
    // 吊柜
    root.add(mesh(new THREE.BoxGeometry(3.0, 0.6, 0.35), counter, -5.4, F1 + 1.9, -5.585));
    // 冰箱
    root.add(mesh(new THREE.BoxGeometry(0.75, 1.8, 0.7), M.metal(0xdde2e8, 0.35, 0.6), -1.85, F1 + 0.9, -5.35));
    root.add(mesh(new THREE.BoxGeometry(0.03, 0.7, 0.04), M.metal(0x9aa5b0, 0.35, 0.8), -1.5, F1 + 1.2, -4.98));
    addEdges(root, 40);
    P(root, { name: '开放式厨房', en: 'Open Kitchen', role: 'internal',
      desc: 'L 形橱柜按洗-切-炒动线布置，台面高 900mm 与灶台落差符合肘部操作高度；深烟机距灶面 650mm，冰箱嵌入高柜端头。' },
      [-0.4, 0.25, -0.4]);
  }

  /* ================================================================
     29. 主卧家具（1.8m 床 / 床头柜 / 通顶衣柜）
  ================================================================ */
  {
    const root = new THREE.Group();
    const fabric = (c) => M.plastic(c, 0.88);
    root.add(mesh(new THREE.BoxGeometry(2.05, 0.32, 1.8), fabric(0x6b5a48), -6.175, L2F + 0.18, 4.0));
    root.add(mesh(new THREE.BoxGeometry(1.95, 0.22, 1.7), fabric(0xe8e4da), -6.125, L2F + 0.45, 4.0));
    root.add(mesh(new THREE.BoxGeometry(1.25, 0.1, 1.7), fabric(0x8fa3b8), -5.6, L2F + 0.55, 4.0));
    for (const dz of [-0.42, 0.42]) {
      root.add(mesh(new THREE.BoxGeometry(0.55, 0.13, 0.36), fabric(0xf0ece2), -6.8, L2F + 0.61, 4.0 + dz));
    }
    root.add(mesh(new THREE.BoxGeometry(0.12, 1.1, 1.9), matWood(0x6e4a30, 0.6), -7.24, L2F + 0.57, 4.0));
    // 床头柜 ×2 + 小台灯
    for (const dz of [-1.25, 1.25]) {
      root.add(mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), matWood(0x7a5c3e, 0.7), -7.0, L2F + 0.245, 4.0 + dz));
      root.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 10), lampMat(), -7.0, L2F + 0.56, 4.0 + dz));
    }
    // 通顶衣柜
    root.add(mesh(new THREE.BoxGeometry(2.8, 2.3, 0.6), matWood(0x8a7561, 0.7), -4.4, L2F + 1.15, 2.43));
    for (const dx of [-0.7, 0.7]) {
      root.add(mesh(new THREE.BoxGeometry(0.02, 2.2, 0.02), matDark(), -4.4 + dx, L2F + 1.15, 2.74));
    }
    root.add(mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), M.chrome(0xd9dfe7), -4.05, L2F + 1.3, 2.75));
    root.add(mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), M.chrome(0xd9dfe7), -4.75, L2F + 1.3, 2.75));
    // 地毯 + 吸顶灯
    root.add(mesh(new THREE.BoxGeometry(2.2, 0.02, 2.6), fabric(0x9a9186), -5.9, L2F + 0.035, 4.0));
    root.add(mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.07, 16), lampMat(), -4.5, L2F + 2.8, 4.0));
    root.add(warmLight(-4.6, L2F + 2.5, 4.0, 10));
    addEdges(root, 40);
    P(root, { name: '主卧家具', en: 'Master Bedroom Furniture', role: 'internal',
      desc: '1.8m 排骨架床配独立袋装弹簧床垫，床头柜对称布置并预留插座；通顶衣柜 2.8m 分四区收纳，吸顶灯 4000K 中性光便于更衣配色。' },
      [-0.4, 0.7, 0.3]);
  }

  /* ================================================================
     30. 书房家具（书桌 / 人体椅 / 书架与藏书）
  ================================================================ */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(1.8, 0.04, 0.7), matWood(0x8a6a48, 0.65), 4.1, L2F + 0.75, 6.85));
    for (const dx of [-0.86, 0.86]) {
      root.add(mesh(new THREE.BoxGeometry(0.04, 0.73, 0.65), matWood(0x6e4a30, 0.65), 4.1 + dx, L2F + 0.375, 6.85));
    }
    // 显示器 + 主机
    root.add(mesh(new THREE.BoxGeometry(0.03, 0.34, 0.58), M.emis(0x2a4a8a, 0.4, { color: 0x0a0d12 }), 4.1, L2F + 0.96, 7.08));
    root.add(mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), matDark(), 4.1, L2F + 0.85, 7.08));
    // 书椅
    const fabric2 = (c) => M.plastic(c, 0.88);
    root.add(mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), fabric2(0x3d434b), 4.1, L2F + 0.47, 6.3));
    root.add(mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), fabric2(0x464d55), 4.1, L2F + 0.75, 6.08));
    root.add(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 10), matDark(), 4.1, L2F + 0.25, 6.3));
    root.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 16), matDark(), 4.1, L2F + 0.05, 6.3));
    // 书架（贴书房西墙）
    const bm = matWood(0x7a5c3e, 0.7);
    root.add(mesh(new THREE.BoxGeometry(0.3, 2.2, 2.4), bm, 1.27, L2F + 1.1, 4.4));
    for (let i = 0; i < 4; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.26, 0.025, 2.3), bm, 1.27, L2F + 0.42 + i * 0.52, 4.4));
    }
    const bookCols = [0x8a4a3a, 0x3a5a7a, 0x4a6a4a, 0x8a7a4a, 0x6a4a6a];
    let bi = 0;
    for (let s = 0; s < 4; s++) {
      let zz = 3.32;
      while (zz < 5.4 && bi < 14) {
        const bw = 0.03 + (bi % 3) * 0.012, bh = 0.17 + (bi % 4) * 0.025;
        root.add(mesh(new THREE.BoxGeometry(0.2, bh, bw),
          M.plastic(bookCols[bi % 5], 0.85), 1.27, L2F + 0.44 + s * 0.52 + bh / 2, zz + bw / 2));
        zz += bw + 0.025;
        bi++;
      }
    }
    // 台灯
    root.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), matDark(), 4.85, L2F + 0.92, 6.9));
    root.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), lampMat(), 4.85, L2F + 1.1, 6.9));
    // 吸顶灯
    root.add(mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.07, 16), lampMat(), 4.2, L2F + 2.8, 4.6));
    root.add(warmLight(4.2, L2F + 2.5, 4.6, 10));
    addEdges(root, 40);
    P(root, { name: '书房家具', en: 'Study Furniture', role: 'internal',
      desc: '书桌临窗布置利用北向漫射光，桌面高 750mm 配键盘托；2.4m 通高书架四层藏书约 300 册，层板挠度按 4mm 控制选材。' },
      [0.4, 0.7, 0.4]);
  }

  /* ================================================================
     参数面板
  ================================================================ */
  const params = [
    { id: 'gate', label: '大门开度', type: 'range', min: 0, max: 100, step: 1, value: 0, unit: '%' },
    { id: 'shutter', label: '车库卷帘门', type: 'range', min: 0, max: 100, step: 1, value: 0, unit: '%' },
    { id: 'lamps', label: '室内灯光', type: 'toggle', value: false },
    { id: 'pool', label: '泳池灯', type: 'toggle', value: false }
  ];
  const pv = id => params.find(p => p.id === id).value;

  function update(dt, t, p, ctx) {
    const night = !!ctx?.night;
    const intOn = p.lamps || night;
    const poolOn = p.pool || night;

    // 大门：入户双开门对开 + 庭院平移门滑动
    const g = (p.gate ?? 0) / 100;
    if (refs.doorL) refs.doorL.rotation.y = -g * 1.4;
    if (refs.doorR) refs.doorR.rotation.y = g * 1.4;
    if (refs.gate) refs.gate.position.x = refs.GATE_X + g * 3.95;

    // 卷帘门：帘板随开度上卷收进卷轴罩
    const R = (p.shutter ?? 0) / 100 * refs.SH_H;
    for (let j = 0; j < refs.slats.length; j++) {
      const s = refs.slats[j];
      s.position.y = s.userData.y0 + Math.min(Math.max(R - j * refs.SLAT, 0), refs.SH_H);
    }
    if (refs.rollSpin) refs.rollSpin.rotation.x = R / 0.15;

    // 灯光状态
    const k = night ? 1.7 : 1.0;
    refs.intLights.forEach(l => { l.intensity = intOn ? 10 * k : 0; });
    refs.lampMats.forEach(m => { m.emissiveIntensity = intOn ? 2.0 : 0.18; });
    refs.winGlass.forEach(m => { m.emissiveIntensity = intOn ? 0.85 : 0.1; });
    if (refs.tvMat) refs.tvMat.emissiveIntensity = intOn ? 1.3 : 0.35;
    refs.courtLights.forEach(l => { l.intensity = night ? 5 : 0; });
    refs.courtMats.forEach(m => { m.emissiveIntensity = night ? 2.2 : 0.06; });
    refs.poolLights.forEach(l => { l.intensity = poolOn ? 13 : 0; });
    if (refs.poolDiscMat) refs.poolDiscMat.emissiveIntensity = poolOn ? 2.6 : 0.12;
    if (refs.waterMat) refs.waterMat.emissiveIntensity = poolOn ? 0.45 : 0.04;

    // 泳池水面微波
    if (refs.water) refs.water.position.y = refs.waterY + Math.sin(t * 1.3) * 0.012;
  }

  return {
    group, parts, params, update,
    hud: () => `现代两层别墅 15×12m · 建面 264㎡ · 部件 ${parts.length} · 大门 ${pv('gate')}% · 卷帘 ${pv('shutter')}% · 室内灯 ${pv('lamps') ? '开' : '关'} · 泳池灯 ${pv('pool') ? '开' : '关'}`
  };
}
