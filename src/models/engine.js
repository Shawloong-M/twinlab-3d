// ============ 丰田 2JZ-GTE 3.0L 直列六缸双涡轮 —— 1:1 程序化建模 ============
// 真实规格：铸铁缸体 + 铝制 DOHC 24V 缸盖；缸径 86mm × 行程 86mm，缸心距 95mm
// 曲柄半径 43mm / 连杆 142mm（λ≈0.30）/ 7 主轴承；点火顺序 1-5-3-6-2-4
// 曲柄销相位（1-6 缸）：0° 120° 240° 240° 120° 0°（1-6、2-5、3-4 两两成对）
// 布局：进气歧管在 +Z（左侧），排气歧管 + 双 CT20 涡轮在 −Z（右侧），
//       前端附件驱动朝 +X，油底壳（前置式）底面接触 y=0，整机长≈0.79m 高≈0.70m
import * as THREE from 'three';
import { M, part, mesh, addEdges, tube, sweepTube, roundedBox, DEG, TAU } from '../lib.js';

/* ---------- 真实尺寸常量（米） ---------- */
const R = 0.043;                                  // 曲柄半径（行程 86mm 之半）
const L = 0.142;                                  // 连杆长（中心距）
const BORE = 0.086;                               // 缸径
const SPACING = 0.095;                            // 缸心距
const CYL_X = [0.2375, 0.1425, 0.0475, -0.0475, -0.1425, -0.2375]; // 1-6 缸（+X 前端为 1 缸）
const PHASE = [0, 120, 240, 240, 120, 0].map(d => d * DEG);        // 曲柄销相位
const CRANK_Y = 0.20;                             // 曲轴中心线高度
const DECK = 0.43;                                // 缸体顶面（缸心高 230mm）
const CAM_Y = 0.565;                              // 凸轮轴中心线高度
const MAIN_X = [-0.285, -0.19, -0.095, 0, 0.095, 0.19, 0.285];     // 7 主轴颈

/* ---------- 几何小工具 ---------- */

/** 皮带闭环：凸轮/带轮外切线 + 外侧包角圆弧（pulleys 需按 CCW 次序给出，且都在凸包上） */
function buildBelt(pulleys, x0, halfW, halfT, mat) {
  const n = pulleys.length;
  for (let i = 0; i < n; i++) {
    const A = pulleys[i], B = pulleys[(i + 1) % n];
    const dy = B.y - A.y, dz = B.z - A.z;
    const dist = Math.hypot(dy, dz);
    const phi = Math.atan2(dz, dy);
    const alpha = Math.acos(Math.min(1, Math.max(-1, (A.r - B.r) / dist)));
    const ca = phi - alpha;                       // 外切线接触角（CCW 环绕取外侧）
    A.aOut = ca; B.aIn = ca;
  }
  const cy0 = pulleys.reduce((s, p) => s + p.y, 0) / n;
  const cz0 = pulleys.reduce((s, p) => s + p.z, 0) / n;
  const pts = [];
  for (const P of pulleys) {
    let d = P.aOut - P.aIn;
    while (d <= -Math.PI) d += TAU;
    while (d > Math.PI) d -= TAU;
    const a0 = P.aIn;
    let a1 = a0 + d;
    const mid = a0 + d / 2;
    if (Math.cos(mid) * (P.y - cy0) + Math.sin(mid) * (P.z - cz0) < 0) {
      a1 = a0 + (d > 0 ? d - TAU : d + TAU);      // 兜底：走背离形心的一侧
    }
    const steps = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 0.14));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (a1 - a0) * k / steps;
      pts.push({ y: P.y + P.r * Math.cos(a), z: P.z + P.r * Math.sin(a) });
    }
  }
  // 闭合矩形截面带（宽 halfW×2 沿 X，厚 halfT×2 沿径向）
  const m = pts.length, pos = [], idx = [];
  for (let i = 0; i < m; i++) {
    const p = pts[i], q = pts[(i + 1) % m];
    const dy = q.y - p.y, dz = q.z - p.z;
    const len = Math.hypot(dy, dz) || 1;
    const ny = -dz / len, nz = dy / len;
    pos.push(
      x0 - halfW, p.y + ny * halfT, p.z + nz * halfT,
      x0 + halfW, p.y + ny * halfT, p.z + nz * halfT,
      x0 + halfW, p.y - ny * halfT, p.z - nz * halfT,
      x0 - halfW, p.y - ny * halfT, p.z - nz * halfT
    );
  }
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m, a = i * 4, b = j * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, a + k2, a + k2, b + k, b + k2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mm = new THREE.Mesh(geo, mat);
  mm.castShadow = true;
  mm.userData.noEdges = true;
  return mm;
}

/** 蜗壳近似：平面阿基米德螺线扫掠变径管（涡轮/压气机壳） */
function snailVolute(cx, cy, cz, a0, turns, rIn, rOut, tR0, tR1, mat) {
  const pts = [], N = 46;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const a = a0 + t * turns * TAU;
    const rr = rIn + (rOut - rIn) * t;
    pts.push(new THREE.Vector3(cx + rr * Math.cos(a), cy + rr * Math.sin(a), cz));
  }
  const m = sweepTube(pts, t => tR0 + (tR1 - tR0) * t,
    { mat, segments: 64, radial: 9, capStart: true, capEnd: true });
  m.userData.noEdges = true;
  return m;
}

/** 径向叶轮（涡轮/压气机叶轮，绕 Z 轴旋转；dir: 锥尖朝向） */
function impeller(rOut, nB, matB, matH, dir) {
  const g = new THREE.Group();
  const disc = mesh(new THREE.CylinderGeometry(rOut * 0.32, rOut * 0.32, 0.008, 14), matH);
  disc.rotation.x = Math.PI / 2;
  disc.userData.noEdges = true;
  g.add(disc);
  const cone = mesh(new THREE.ConeGeometry(rOut * 0.30, rOut * 0.5, 12), matH, 0, 0, dir * rOut * 0.18);
  cone.rotation.x = dir * Math.PI / 2;
  cone.userData.noEdges = true;
  g.add(cone);
  for (let k = 0; k < nB; k++) {
    const a = k / nB * TAU;
    const bl = mesh(new THREE.BoxGeometry(rOut * 0.62, rOut * 0.24, 0.003), matB,
      Math.cos(a) * rOut * 0.60, Math.sin(a) * rOut * 0.60, 0);
    bl.rotation.z = a;
    bl.userData.noEdges = true;
    g.add(bl);
  }
  return g;
}

/** 带轮/齿带轮：低径向段数圆柱暗示轮齿 + 亮圈 + 减重孔 */
function makeSprocket(r, th, mat, teeth = 20, holes = 0) {
  const g = new THREE.Group();
  const disc = mesh(new THREE.CylinderGeometry(r, r, th, teeth), mat);
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  const rim = mesh(new THREE.TorusGeometry(r * 0.9, 0.0042, 6, Math.max(18, teeth)),
    M.metal(0x8b95a1, 0.42, 0.88));
  rim.rotation.y = Math.PI / 2;
  rim.userData.noEdges = true;
  g.add(rim);
  for (let k = 0; k < holes; k++) {
    const a = k / holes * TAU + 0.4;
    const hole = mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, th + 0.004, 10),
      M.plastic(0x14171c, 0.8), 0, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
    hole.rotation.z = Math.PI / 2;
    hole.userData.noEdges = true;
    g.add(hole);
  }
  return g;
}

/* ================================================================ */
export function buildEngine() {
  const group = new THREE.Group();
  const parts = [];
  const refs = { pistons: [], rods: [], valves: [], lobes: [], camSprockets: [], pulleys: [], turboWheels: [], ghostMats: [] };

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };

  /* ---- 材质 ---- */
  const blockMat = M.castAlu(0x5f6771);                       // 铸铁缸体（深灰）
  const linerMat = M.metal(0x39404a, 0.42, 0.9);              // 缸套内壁
  const headMat = M.castAlu(0x99a3ae);                        // 铝缸盖
  const coverMat = M.brushed(0xc6ccd5);                       // 银色气门室盖
  const panMat = M.castAlu(0x57606a);                         // 油底壳
  const plateMat = M.metal(0x6a737e, 0.5, 0.86);              // 正时后盖板
  const steel = M.metal(0xc9d3dd, 0.3, 0.92);                 // 机加工亮钢
  const chrome = M.chrome(0xd9dee5);
  const ironDark = M.metal(0x4c555f, 0.5, 0.86);              // 主轴承盖/支架
  const aluMid = M.castAlu(0x8f99a5);                         // 水泵/压气机壳
  const aluBright = M.brushed(0xb6bfc9);
  const rubberM = M.rubber(0x16181c);
  const beltMatA = M.rubber(0x17191d, { side: THREE.DoubleSide });
  const beltMatT = M.rubber(0x141619, { side: THREE.DoubleSide });
  const dark = M.plastic(0x20242b, 0.55);
  const coilDark = M.plastic(0x262b33, 0.5);
  const ceramic = M.plastic(0xe6e2d4, 0.45);
  const brass = M.metal(0xc59d4e, 0.4, 0.85);
  const glowMat = M.metal(0x5e6166, 0.44, 0.88, { emissive: 0x2a0906, emissiveIntensity: 0.12 }); // 排气热辐射
  refs.ghostMats.push(blockMat, linerMat, headMat, coverMat, panMat, plateMat);

  /* ================= 1. 铸铁缸体 ================= */
  {
    const root = new THREE.Group();
    // 缸体主体（裙部 0.125 → 缸体顶面 0.43）
    root.add(mesh(roundedBox(0.60, 0.305, 0.28, 0.018), blockMat, -0.005, 0.2775, 0));
    // 6 缸套（透视可见活塞）
    for (const x of CYL_X) {
      const liner = mesh(new THREE.CylinderGeometry(BORE / 2 + 0.0015, BORE / 2 + 0.0015, 0.095, 26, 1, true),
        linerMat, x, 0.3825, 0);
      liner.userData.noEdges = true;
      root.add(liner);
    }
    // 侧面铸造加强筋
    for (const sz of [1, -1]) {
      for (const x of [-0.21, -0.07, 0.07, 0.21]) {
        const rib = mesh(new THREE.BoxGeometry(0.014, 0.20, 0.012), blockMat, x, 0.30, sz * 0.146);
        rib.userData.noEdges = true;
        root.add(rib);
      }
    }
    // 冻结塞（水道砂芯孔铜塞）
    for (const sz of [1, -1]) for (const x of [-0.19, 0, 0.19]) {
      const plug = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14), brass, x, 0.37, sz * 0.141);
      plug.rotation.x = Math.PI / 2;
      root.add(plug);
    }
    // 7 主轴承盖
    for (const mx of MAIN_X) {
      root.add(mesh(roundedBox(0.05, 0.075, 0.16, 0.01), ironDark, mx, 0.1125, 0));
      for (const dz of [-0.055, 0.055]) {
        root.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 6), steel, mx, 0.13, dz));
      }
    }
    // 后端飞轮壳接合面 + 起动机
    const flange = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 36), blockMat, -0.313, 0.20, 0);
    flange.rotation.z = Math.PI / 2;
    root.add(flange);
    root.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.09, 14), ironDark, -0.26, 0.12, -0.158));
    root.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 10), ironDark, -0.215, 0.152, -0.158));
    // 两侧引擎脚支架 + 橡胶垫
    for (const sz of [1, -1]) {
      root.add(mesh(new THREE.BoxGeometry(0.16, 0.09, 0.03), ironDark, -0.06, 0.34, sz * 0.155));
      const pad = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14), rubberM, -0.06, 0.34, sz * 0.178);
      pad.rotation.x = Math.PI / 2;
      root.add(pad);
    }
    // 机油尺导管
    root.add(mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.07, 8), steel, 0.292, 0.245, 0.148));
    addEdges(root, 38);
    P(root, { name: '铸铁缸体', en: 'Cast-Iron Engine Block', role: 'shell',
      desc: '2JZ-GTE 的灰铸铁缸体是其千匹改装潜力的根基：7 主轴承支承，缸径 86mm×行程 86mm 的正方形冲程，缸心距 95mm。缸体内部铸有水套与机油道，铸铁的低热膨胀与高刚性让缸垫在 1.3 bar 增压下依然可靠密封。' },
      [0.1, 0.15, 0.85]);
  }

  /* ================= 2. 铝合金 DOHC 缸盖 ================= */
  {
    const root = new THREE.Group();
    root.add(mesh(roundedBox(0.575, 0.13, 0.26, 0.015), headMat, -0.005, 0.495, 0));
    // 进/排气道法兰凸台
    for (const x of CYL_X) {
      const inP = mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.02, 14), aluMid, x, 0.472, 0.128);
      inP.rotation.x = Math.PI / 2;
      root.add(inP);
      const exP = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), ironDark, x, 0.465, -0.128);
      exP.rotation.x = Math.PI / 2;
      root.add(exP);
    }
    // 气门导管 ×24
    for (const x of CYL_X) for (const side of [1, -1]) for (const dx of [-0.018, 0.018]) {
      const gd = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.035, 8), dark, x + dx, 0.522, side * 0.048);
      gd.userData.noEdges = true;
      root.add(gd);
    }
    // 凸轮轴轴承座
    for (const side of [1, -1]) for (const jx of MAIN_X) {
      const tw = mesh(new THREE.BoxGeometry(0.026, 0.024, 0.05), headMat, jx, 0.558, side * 0.055);
      tw.userData.noEdges = true;
      root.add(tw);
    }
    // 前端节温器水室
    root.add(mesh(roundedBox(0.055, 0.06, 0.10, 0.02), aluMid, 0.29, 0.50, 0.03));
    root.add(mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.04, 12), rubberM, 0.29, 0.503, 0.09));
    addEdges(root, 38);
    P(root, { name: '铝合金 DOHC 缸盖', en: 'Aluminium DOHC Cylinder Head', role: 'shell',
      desc: '铝制 DOHC 24 气门缸盖：每缸双进气门加双排气门，浅盆形燃烧室、火花塞居中布置。凸轮轴直接压动桶形挺柱驱动气门，缸盖与铸铁缸体之间为多层钢片缸垫（MLS），保证增压工况下的燃烧密封。' },
      [0, 0.85, 0.4]);
  }

  /* ================= 3. 银色肋条式气门室盖 ================= */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.545, 0.012, 0.245), coverMat, -0.005, 0.566, 0));
    root.add(mesh(roundedBox(0.53, 0.075, 0.215, 0.02), coverMat, -0.005, 0.6075, 0));
    // 标志性纵向加强肋 ×7
    for (let k = 0; k < 7; k++) {
      const rib = mesh(new THREE.BoxGeometry(0.50, 0.011, 0.013), coverMat, -0.005, 0.6495, -0.075 + k * 0.025);
      rib.userData.noEdges = true;
      root.add(rib);
    }
    // 6 个点火线圈安装塔
    for (const x of CYL_X) {
      root.add(mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.024, 14), coverMat, x, 0.653, 0));
    }
    // 机油加注盖 + PCV 阀
    root.add(mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.026, 16), aluBright, 0.20, 0.657, 0.09));
    root.add(mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 16), dark, 0.20, 0.665, 0.09));
    root.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.032, 10), aluMid, -0.20, 0.655, -0.06));
    addEdges(root, 40);
    P(root, { name: '银色肋条式气门室盖', en: 'Ribbed Cam Cover', role: 'shell',
      desc: '2JZ 标志性的银色凸轮罩：铝合金压铸，顶面多条纵向加强肋抑制噪声辐射，中央一排点火线圈安装塔。罩内火花塞井道为高压线圈对中导向，后端 PCV 阀维持曲轴箱负压防止机油蒸汽外泄。' },
      [0, 1.5, 0.15]);
  }

  /* ================= 4. 前置式油底壳 ================= */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.62, 0.014, 0.30), panMat, 0, 0.125, 0));       // 安装法兰
    root.add(mesh(roundedBox(0.44, 0.06, 0.28, 0.015), panMat, -0.09, 0.095, 0));        // 浅壳段
    const wedge = mesh(new THREE.BoxGeometry(0.12, 0.075, 0.26), panMat, 0.045, 0.062, 0); // 过渡段
    wedge.rotation.z = -0.55;
    wedge.userData.noEdges = true;
    root.add(wedge);
    root.add(mesh(roundedBox(0.25, 0.085, 0.25, 0.018), panMat, 0.19, 0.0425, 0));       // 前端深储油池
    for (let k = 0; k < 3; k++) {                                                        // 储油池散热肋
      const rib = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.014), panMat, 0.19, 0.008, -0.07 + k * 0.07);
      rib.userData.noEdges = true;
      root.add(rib);
    }
    root.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 6), steel, 0.27, 0.006, 0)); // 放油螺栓
    addEdges(root, 40);
    P(root, { name: '前置式油底壳', en: 'Front-Sump Oil Pan', role: 'shell',
      desc: '前置式油底壳是 2JZ 的识别特征之一：浅壳体加前端深储油池，为 Supra 的前水箱与低引擎盖线让出空间。内部挡油板防止急加减速时机油甩离吸油口，底部放油螺栓带磁性以吸附磨屑。' },
      [0, -0.85, 0.35]);
  }

  /* ================= 5. 曲轴（7 主轴承 · 6 曲柄销） ================= */
  {
    const root = new THREE.Group();
    const spin = new THREE.Group();            // 绕曲轴轴线旋转
    spin.position.set(0, CRANK_Y, 0);
    root.add(spin);
    const crankM = M.metal(0xb0bac4, 0.36, 0.9);
    const webM = M.metal(0x8b95a1, 0.42, 0.88);
    for (const mx of MAIN_X) {                 // 主轴颈 ×7
      const j = mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.030, 16), crankM, mx, 0, 0);
      j.rotation.z = Math.PI / 2;
      spin.add(j);
    }
    CYL_X.forEach((x, i) => {                  // 曲柄销 + 曲柄臂 + 配重
      const throwG = new THREE.Group();
      throwG.position.x = x;
      throwG.rotation.x = PHASE[i];
      const pin = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.040, 14), crankM, 0, R, 0);
      pin.rotation.z = Math.PI / 2;
      throwG.add(pin);
      for (const dx of [-0.028, 0.028]) {
        const web = mesh(new THREE.BoxGeometry(0.016, 0.135, 0.092), webM, dx, 0.022, 0);
        web.userData.noEdges = true;
        throwG.add(web);
        const cw = mesh(new THREE.BoxGeometry(0.016, 0.07, 0.096), webM, dx, -0.062, 0);
        cw.userData.noEdges = true;
        throwG.add(cw);
      }
      spin.add(throwG);
    });
    const nose = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12), crankM, 0.355, 0, 0); // 前端轴颈
    nose.rotation.z = Math.PI / 2;
    spin.add(nose);
    const tailF = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.016, 24), crankM, -0.302, 0, 0); // 后端法兰
    tailF.rotation.z = Math.PI / 2;
    spin.add(tailF);
    addEdges(spin, 42);
    P(root, { name: '曲轴', en: 'Crankshaft', role: 'core',
      desc: '直六曲轴的曲柄销两两成对（1-6、2-5、3-4 缸相位 0°/120°/240°），一阶与二阶往复惯性力天然平衡，无需平衡轴即如丝般平顺。7 个主轴颈大幅提高弯曲刚度，前端减振器负责抑制曲轴扭转振动。' },
      [0, -0.2, -0.7]);
    refs.crank = spin;
  }

  /* ================= 6. 活塞组 ×6 ================= */
  {
    const root = new THREE.Group();
    const pistonM = M.metal(0xb9c2cc, 0.32, 0.95);
    const ringM = M.chrome(0xdde3ea);
    for (let i = 0; i < 6; i++) {
      const holder = new THREE.Group();        // 定位在曲轴中心线
      holder.position.set(CYL_X[i], CRANK_Y, 0);
      const asm = new THREE.Group();           // 沿 Y 往复（原点=活塞销）
      const skirt = mesh(new THREE.CylinderGeometry(0.0422, 0.0412, 0.060, 24), pistonM, 0, 0.014, 0);
      asm.add(skirt);
      const crown = mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.002, 20), M.plastic(0x2a2e34, 0.7), 0, 0.0435, 0);
      crown.userData.noEdges = true;
      asm.add(crown);
      for (const [ry, mt] of [[0.026, ringM], [0.034, ringM], [0.041, M.metal(0x8b95a1, 0.4, 0.85)]]) {
        const ring = mesh(new THREE.TorusGeometry(0.0425, 0.0035, 6, 22), mt, 0, ry, 0);
        ring.rotation.x = Math.PI / 2;
        ring.userData.noEdges = true;
        asm.add(ring);
      }
      const pin = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.074, 10), steel, 0, 0, 0);
      pin.rotation.z = Math.PI / 2;
      asm.add(pin);
      holder.add(asm);
      root.add(holder);
      refs.pistons.push(asm);
    }
    addEdges(root, 44);
    P(root, { name: '活塞组 ×6', en: 'Pistons ×6', role: 'core',
      desc: '86mm 活塞与同尺寸行程构成「方形」冲程，兼顾低转扭矩与高转功率；JDM 版压缩比 8.5:1 适配涡轮增压。顶部浅盆凹坑组织挤流，两道气环加一道油环控制窜气与机油耗，活塞销为全浮式。' },
      [0.15, 0.8, 0.55]);
  }

  /* ================= 7. 连杆组 ×6 ================= */
  {
    const root = new THREE.Group();
    const rodM = M.metal(0xb6c0ca, 0.34, 0.92);
    for (let i = 0; i < 6; i++) {
      const holder = new THREE.Group();
      holder.position.set(CYL_X[i], CRANK_Y, 0);
      const asm = new THREE.Group();           // 原点=曲柄销中心，绕其摆动
      const beam = mesh(new THREE.BoxGeometry(0.018, L - 0.05, 0.028), rodM, 0, L / 2, 0);
      beam.userData.noEdges = true;
      asm.add(beam);
      const bigEnd = mesh(new THREE.TorusGeometry(0.026, 0.011, 8, 18), rodM, 0, 0, 0);
      bigEnd.rotation.y = Math.PI / 2;
      asm.add(bigEnd);
      for (const dx of [-0.017, 0.017]) {      // 大头盖螺栓
        const bolt = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), steel, dx, -0.022, 0);
        bolt.userData.noEdges = true;
        asm.add(bolt);
      }
      const smallEnd = mesh(new THREE.TorusGeometry(0.0135, 0.0075, 8, 14), rodM, 0, L, 0);
      smallEnd.rotation.y = Math.PI / 2;
      asm.add(smallEnd);
      holder.add(asm);
      root.add(holder);
      refs.rods.push(asm);
    }
    addEdges(root, 46);
    P(root, { name: '连杆组 ×6', en: 'Connecting Rods ×6', role: 'core',
      desc: '142mm 连杆带来 1.65 的长径比（λ≈0.30）：较长的连杆减小活塞侧向压力与二阶惯性力，是 2JZ 高转平顺的原因之一。工字形截面杆身在拉压交变载荷下兼顾刚度与重量，大头为涨断工艺剖分。' },
      [0.1, 0.4, 0.95]);
  }

  /* ================= 8. 双顶置凸轮轴 ================= */
  {
    const root = new THREE.Group();
    const camM = M.metal(0xc0c9d3, 0.3, 0.94);
    for (const side of [1, -1]) {
      const shaft = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.57, 12), camM, 0.005, CAM_Y, side * 0.055);
      shaft.rotation.z = Math.PI / 2;
      shaft.userData.noEdges = true;
      root.add(shaft);
      for (const jx of MAIN_X) {               // 轴颈 ×7
        const j = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.016, 12), camM, jx, CAM_Y, side * 0.055);
        j.rotation.z = Math.PI / 2;
        j.userData.noEdges = true;
        root.add(j);
      }
      for (let i = 0; i < 6; i++) {            // 每缸 2 桃尖 ×12
        for (const dx of [-0.018, 0.018]) {
          const lobe = new THREE.Group();
          const base = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.016, 16), camM, 0, 0, 0);
          base.rotation.z = Math.PI / 2;
          base.userData.noEdges = true;
          lobe.add(base);
          const nose = mesh(new THREE.BoxGeometry(0.016, 0.024, 0.010), camM, 0, 0.013, 0);
          nose.userData.noEdges = true;
          lobe.add(nose);
          const tip = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.016, 8), camM, 0, 0.023, 0);
          tip.rotation.z = Math.PI / 2;
          tip.userData.noEdges = true;
          lobe.add(tip);
          lobe.position.set(CYL_X[i] + dx, CAM_Y, side * 0.055);
          root.add(lobe);
          const peak = side > 0 ? 2.5 * Math.PI : 1.5 * Math.PI;   // 进气峰 450° / 排气峰 270°（720° 循环）
          refs.lobes.push({ m: lobe, base: PHASE[i] - peak });
        }
      }
    }
    addEdges(root, 46);
    P(root, { name: '凸轮轴组 ×2', en: 'DOHC Camshafts', role: 'core',
      desc: '双顶置凸轮轴经正时皮带以 1:2 减速随曲轴旋转：进气凸轮在 +Z 侧、排气凸轮在 −Z 侧，各 12 个桃尖直接压动桶形挺柱。凸轮型线决定 7.8mm 气门升程与开启持续期，是引擎呼吸节奏的总指挥。' },
      [0.3, 1.2, 0.3]);
  }

  /* ================= 9. 气门与弹簧组 ×24 ================= */
  {
    const root = new THREE.Group();
    const springPts = [];
    { // 共享弹簧几何（省内存）
      const turns = 3.6, N = 26, r = 0.0125, h = 0.074;
      for (let k = 0; k <= N; k++) {
        const t = k / N, a = t * turns * TAU;
        springPts.push(new THREE.Vector3(r * Math.cos(a), t * h, r * Math.sin(a)));
      }
    }
    const springGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 40, 0.0021, 6);
    const springM = M.metal(0xa8b2be, 0.4, 0.82);
    for (let i = 0; i < 6; i++) {
      for (const side of [1, -1]) {            // +1 进气 / -1 排气
        for (const dx of [-0.018, 0.018]) {
          const vg = new THREE.Group();        // 气门（原点=气门座面）
          const matV = side > 0 ? M.metal(0xc7d1db, 0.3, 0.94) : M.metal(0x9a8e7c, 0.36, 0.9);
          const headR = side > 0 ? 0.0165 : 0.0145;
          const vHead = mesh(new THREE.CylinderGeometry(headR, headR * 0.72, 0.009, 14), matV, 0, 0.0045, 0);
          vHead.userData.noEdges = true;
          vg.add(vHead);
          const stem = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.092, 8), matV, 0, 0.055, 0);
          stem.userData.noEdges = true;
          vg.add(stem);
          const retainer = mesh(new THREE.CylinderGeometry(0.0155, 0.012, 0.007, 12), steel, 0, 0.089, 0);
          retainer.userData.noEdges = true;
          vg.add(retainer);
          const bucket = mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.012, 12), M.metal(0x9aa4b0, 0.4, 0.88), 0, 0.095, 0);
          bucket.userData.noEdges = true;
          vg.add(bucket);
          vg.position.set(CYL_X[i] + dx, 0.447, side * 0.048);
          root.add(vg);
          const spring = mesh(springGeo, springM, CYL_X[i] + dx, 0.462, side * 0.048);
          root.add(spring);
          refs.valves.push({ g: vg, spring, y0: 0.447, i, intake: side > 0 });
        }
      }
    }
    addEdges(root, 48);
    P(root, { name: '气门与弹簧组 ×24', en: 'Valves & Springs ×24', role: 'core',
      desc: '每缸 4 气门（进 2 排 2）共 24 只：进气门直径大于排气门以提升充气效率，排气门用耐热合金承受约 800°C 废气。气门弹簧把气门压紧在座圈上，高转时要克服凸轮加速度惯性防止「气门飞脱」。' },
      [0, 1.05, 0.75]);
  }

  /* ================= 10. 点火线圈组 ×6 ================= */
  {
    const root = new THREE.Group();
    for (const x of CYL_X) {
      const boot = mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.175, 10), rubberM, x, 0.5825, 0);
      boot.userData.noEdges = true;
      root.add(boot);
      root.add(mesh(roundedBox(0.050, 0.046, 0.050, 0.012), coilDark, x, 0.688, 0));
      root.add(mesh(roundedBox(0.052, 0.010, 0.052, 0.004), aluBright, x, 0.715, 0));
      root.add(mesh(new THREE.BoxGeometry(0.024, 0.020, 0.018), dark, x - 0.036, 0.692, 0));
      // 火花塞（透视可见）
      root.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.010, 6), steel, x, 0.452, 0));
      root.add(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.038, 10), ceramic, x, 0.476, 0));
      root.add(mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.006, 6), M.metal(0xd8b24a, 0.3, 1), x, 0.446, 0));
    }
    addEdges(root, 42);
    P(root, { name: '点火线圈组 ×6', en: 'Ignition Coils ×6', role: 'core',
      desc: '6 只点火线圈一字排列于凸轮罩中央，按 1-5-3-6-2-4 顺序逐缸独立点火。12V 车电被升压至约 3 万伏，经火花塞间隙释放电弧；Turbo 版使用冷型火花塞与更小的热值间隙以抑制增压爆震。' },
      [0.2, 1.85, 0.4]);
  }

  /* ================= 11. 正时带轮与正时皮带 ================= */
  {
    const root = new THREE.Group();
    // 正时室后盖板
    root.add(mesh(new THREE.BoxGeometry(0.006, 0.51, 0.29), plateMat, 0.302, 0.37, 0));
    // 曲轴正时齿轮
    const crankSpr = makeSprocket(0.050, 0.016, ironDark, 18, 0);
    crankSpr.position.set(0.315, CRANK_Y, 0);
    root.add(crankSpr);
    // 双凸轮轴齿轮 ×2
    for (const side of [1, -1]) {
      const spr = makeSprocket(0.062, 0.018, ironDark, 22, 3);
      spr.position.set(0.315, CAM_Y, side * 0.055);
      root.add(spr);
      refs.camSprockets.push(spr);
      root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 10), steel, 0.2975, CAM_Y, side * 0.055));
    }
    // 水泵轮（由正时皮带驱动）
    const wpPulley = makeSprocket(0.036, 0.020, aluMid, 14, 3);
    wpPulley.position.set(0.315, 0.42, 0.045);
    root.add(wpPulley);
    refs.pulleys.push({ m: wpPulley, ratio: 0.050 / 0.036 });
    root.add(mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.045, 16), aluMid, 0.312, 0.42, 0.045));
    // 液压张紧轮（顶在皮带背面）
    const tPulley = makeSprocket(0.030, 0.018, steel, 14, 0);
    tPulley.position.set(0.315, 0.367, -0.114);
    root.add(tPulley);
    refs.pulleys.push({ m: tPulley, ratio: 0.050 / 0.030 });
    const tArm = mesh(new THREE.BoxGeometry(0.012, 0.075, 0.05), ironDark, 0.310, 0.325, -0.096);
    tArm.rotation.z = 0.45;
    tArm.userData.noEdges = true;
    root.add(tArm);
    root.add(mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.05, 10), steel, 0.318, 0.292, -0.082));
    // 正时皮带（曲轴 → 排气凸轮 → 进气凸轮 → 水泵 闭环）
    root.add(buildBelt([
      { y: CRANK_Y, z: 0, r: 0.050 },
      { y: CAM_Y, z: -0.055, r: 0.062 },
      { y: CAM_Y, z: 0.055, r: 0.062 },
      { y: 0.42, z: 0.045, r: 0.036 }
    ], 0.315, 0.010, 0.0022, beltMatT));
    addEdges(root, 42);
    P(root, { name: '正时带轮与正时皮带', en: 'Timing Belt Drive', role: 'internal',
      desc: '正时皮带以严格 2:1 传动比同步曲轴与双凸轮轴，液压张紧轮从背面顶紧皮带防止跳齿。正时皮带需定期更换，一旦断裂凸轮停转、活塞上行顶弯气门，是间歇维护清单上最重要的一项。' },
      [1.15, 0.4, 0.1]);
    refs.crankSprocket = crankSpr;
  }

  /* ================= 12. 进气歧管总成 ================= */
  {
    const root = new THREE.Group();
    const plenum = mesh(roundedBox(0.55, 0.115, 0.105, 0.042), aluMid, -0.005, 0.585, 0.185);
    root.add(plenum);
    for (const x of CYL_X) {                   // 6 根弯曲 runner
      root.add(tube([
        new THREE.Vector3(x, 0.552, 0.168),
        new THREE.Vector3(x, 0.522, 0.178),
        new THREE.Vector3(x, 0.492, 0.162),
        new THREE.Vector3(x, 0.470, 0.132)
      ], 0.023, aluMid, 20));
    }
    // 燃油导轨 + 喷油嘴
    const rail = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.52, 10), steel, 0, 0.565, 0.142);
    rail.rotation.z = Math.PI / 2;
    root.add(rail);
    for (const x of CYL_X) {
      root.add(mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.032, 8), dark, x, 0.548, 0.148));
    }
    addEdges(root, 40);
    P(root, { name: '进气歧管总成', en: 'Intake Manifold', role: 'internal',
      desc: '铸铝稳压腔（plenum）位于进气侧上方，6 根独立弯管分别引向各缸进气道，利用进气脉冲的惯性增压效应提升充气效率。燃油导轨与喷油嘴布置在 runner 入口，ECU 按缸独立控制喷油正时与脉宽。' },
      [0.1, 0.6, 1.35]);
  }

  /* ================= 13. 节气门体与进气喉管 ================= */
  {
    const root = new THREE.Group();
    const tb = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.062, 20), aluBright, 0.302, 0.585, 0.185);
    tb.rotation.z = Math.PI / 2;
    root.add(tb);
    const shaft = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.072, 8), steel, 0.302, 0.585, 0.185);
    shaft.rotation.x = Math.PI / 2;
    shaft.userData.noEdges = true;
    root.add(shaft);
    const lip = mesh(new THREE.TorusGeometry(0.034, 0.006, 8, 20), aluBright, 0.333, 0.585, 0.185);
    lip.rotation.y = Math.PI / 2;
    lip.userData.noEdges = true;
    root.add(lip);
    root.add(mesh(new THREE.BoxGeometry(0.030, 0.022, 0.026), dark, 0.302, 0.612, 0.185)); // TPS
    // 进气喉管 + 空气流量计
    root.add(tube([
      new THREE.Vector3(0.333, 0.585, 0.185),
      new THREE.Vector3(0.40, 0.585, 0.185),
      new THREE.Vector3(0.46, 0.55, 0.17),
      new THREE.Vector3(0.50, 0.49, 0.135)
    ], 0.032, rubberM, 24));
    root.add(mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 18), steel, 0.362, 0.585, 0.185));
    root.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.055, 16), aluMid, 0.52, 0.475, 0.125));
    root.add(mesh(new THREE.BoxGeometry(0.026, 0.03, 0.02), dark, 0.52, 0.515, 0.125));
    addEdges(root, 42);
    P(root, { name: '节气门体与进气喉管', en: 'Throttle Body & Intake Duct', role: 'internal',
      desc: '节气门体位于稳压腔前端，蝶形阀片由油门拉索驱动控制进气流量，旁通空气阀维持怠速稳定。喉管前端的空气流量计测量进入引擎的空气质量流量，是 ECU 计算基本喷油量的核心传感。' },
      [0.95, 0.75, 1.05]);
  }

  /* ================= 14/15. 排气歧管 ×2（前 3 缸 / 后 3 缸） ================= */
  const buildExhaust = (idx0, xt, nm) => {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.31, 0.105, 0.014), glowMat, xt, 0.465, -0.133));
    for (let k = 0; k < 3; k++) {
      const xi = CYL_X[idx0 + k];
      root.add(tube([
        new THREE.Vector3(xi, 0.458, -0.140),
        new THREE.Vector3(xi, 0.428, -0.178),
        new THREE.Vector3(xi + (xt - xi) * 0.5, 0.398, -0.212),
        new THREE.Vector3(xt, 0.378, -0.228)
      ], 0.020, glowMat, 20));
    }
    const log = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.23, 14), glowMat, xt, 0.375, -0.228);
    log.rotation.z = Math.PI / 2;
    root.add(log);
    root.add(tube([                             // 集气管 → 涡轮进口
      new THREE.Vector3(xt, 0.352, -0.230),
      new THREE.Vector3(xt, 0.336, -0.252),
      new THREE.Vector3(xt, 0.330, -0.266)
    ], 0.022, glowMat, 12));
    addEdges(root, 46);
    P(root, nm, [xt > 0 ? 0.55 : -0.55, 0.35, -1.25]);
  };
  buildExhaust(0, 0.1425, { name: '排气歧管（前 3 缸）', en: 'Exhaust Manifold (Cyl 1-3)', role: 'internal',
    desc: '前 3 缸（1-2-3）的排气短管汇成一路集气管，驱动前置 CT20 涡轮。排气歧管直接承受 800-950°C 废气冲刷，高负荷下会烧至暗红，是全机热负荷最高的部件之一。' });
  buildExhaust(3, -0.1425, { name: '排气歧管（后 3 缸）', en: 'Exhaust Manifold (Cyl 4-6)', role: 'internal',
    desc: '后 3 缸（4-5-6）排气汇集驱动后侧 CT20 涡轮，与前组完全对称。两颗涡轮各自负责 3 缸、互不干扰的并联布局，让增压建立更线性，也是 2JZ-GTE「并联双涡轮」的名称由来。' });

  /* ================= 16/17. CT20 涡轮增压器 ×2 ================= */
  const buildTurbo = (xt, nm) => {
    const root = new THREE.Group();
    // 涡轮侧：背板 + 叶轮 + 环箍 + 铸铁蜗壳
    root.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 30), glowMat, xt, 0.30, -0.200));
    const tWheel = impeller(0.054, 10, M.metal(0x8f8474, 0.38, 0.92), M.metal(0x7a7062, 0.42, 0.9), 1);
    tWheel.position.set(xt, 0.30, -0.225);
    root.add(tWheel);
    refs.turboWheels.push(tWheel);
    const ring1 = mesh(new THREE.TorusGeometry(0.068, 0.013, 8, 28), glowMat, xt, 0.30, -0.240);
    ring1.userData.noEdges = true;
    root.add(ring1);
    root.add(snailVolute(xt, 0.30, -0.268, Math.PI / 2, 1.3, 0.030, 0.062, 0.014, 0.026, glowMat));
    // 中心体（轴承座）+ 油路
    root.add(mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.052, 18), aluMid, xt, 0.30, -0.326));
    root.add(tube([
      new THREE.Vector3(xt + 0.03, 0.33, -0.15),
      new THREE.Vector3(xt + 0.015, 0.318, -0.24),
      new THREE.Vector3(xt, 0.312, -0.30)
    ], 0.0035, steel, 10));
    root.add(tube([
      new THREE.Vector3(xt - 0.01, 0.286, -0.30),
      new THREE.Vector3(xt - 0.03, 0.22, -0.26),
      new THREE.Vector3(xt - 0.035, 0.16, -0.22)
    ], 0.008, steel, 10));
    // 压气机侧：背盘 + 叶轮 + 环箍 + 铝蜗壳 + 轴向进气口
    root.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.010, 24), aluBright, xt, 0.30, -0.352));
    const cWheel = impeller(0.050, 11, M.metal(0xcfd6de, 0.25, 0.95), chrome, -1);
    cWheel.position.set(xt, 0.30, -0.372);
    root.add(cWheel);
    refs.turboWheels.push(cWheel);
    const ring2 = mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 26), aluBright, xt, 0.30, -0.388);
    ring2.userData.noEdges = true;
    root.add(ring2);
    root.add(snailVolute(xt, 0.30, -0.408, Math.PI / 2, 1.0, 0.032, 0.052, 0.010, 0.019, aluBright));
    root.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.065, 12), rubberM, xt, 0.30, -0.4525)); // 进气口
    root.add(mesh(new THREE.TorusGeometry(0.020, 0.004, 6, 14), steel, xt, 0.30, -0.472));
    // 压气机出气管（上行去中冷器）
    root.add(tube([
      new THREE.Vector3(xt, 0.352, -0.408),
      new THREE.Vector3(xt, 0.425, -0.388),
      new THREE.Vector3(xt, 0.49, -0.352),
      new THREE.Vector3(xt, 0.528, -0.320)
    ], 0.023, aluMid, 20));
    const flange = mesh(new THREE.TorusGeometry(0.028, 0.005, 6, 16), aluMid, xt, 0.532, -0.316);
    flange.rotation.x = -0.55;
    flange.userData.noEdges = true;
    root.add(flange);
    // 废气旁通阀执行器 + 推杆
    root.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.026, 16), steel, xt + 0.098, 0.345, -0.262));
    root.add(mesh(new THREE.SphereGeometry(0.018, 12, 8), steel, xt + 0.098, 0.345, -0.278));
    root.add(tube([
      new THREE.Vector3(xt + 0.082, 0.345, -0.262),
      new THREE.Vector3(xt + 0.058, 0.342, -0.268)
    ], 0.0035, steel, 6));
    // 涡轮落水管
    root.add(tube([
      new THREE.Vector3(xt - 0.059, 0.278, -0.268),
      new THREE.Vector3(xt - 0.078, 0.205, -0.272),
      new THREE.Vector3(xt - 0.072, 0.13, -0.262)
    ], 0.030, glowMat, 16));
    addEdges(root, 46);
    P(root, nm, [xt > 0 ? 0.85 : -0.85, 0.1, -1.55]);
  };
  buildTurbo(0.1425, { name: '涡轮增压器（前）', en: 'CT20 Turbocharger (Front)', role: 'internal',
    desc: 'CT20 涡轮增压器：约 700°C 的废气推动涡轮叶轮，同轴带动压气机叶轮以十万转级转速压缩进气，原厂增压约 0.75 bar。铸铁蜗壳隔热，中心体浮动轴承靠机油润滑，废气旁通阀防止过增压。' });
  buildTurbo(-0.1425, { name: '涡轮增压器（后）', en: 'CT20 Turbocharger (Rear)', role: 'internal',
    desc: '后置 CT20 涡轮与前置完全同规格，陶瓷涡轮叶轮（JDM 版）改善低速响应。两颗增压器的压气机出气在前端汇合进入前置中冷器，降温后更高的空气密度是 280 马力的来源。' });

  /* ================= 18. 前端附件驱动系统 ================= */
  {
    const root = new THREE.Group();
    // 曲轴减振轮（多楔带被轮）
    const damper = new THREE.Group();
    damper.position.set(0.400, CRANK_Y, 0);
    const hub = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.052, 16), steel, -0.005, 0, 0);
    hub.rotation.z = Math.PI / 2;
    damper.add(hub);
    const outer = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.032, 28), ironDark, 0, 0, 0);
    outer.rotation.z = Math.PI / 2;
    damper.add(outer);
    for (const dx of [-0.006, 0, 0.006]) {     // 3 道楔带槽
      const gr = mesh(new THREE.TorusGeometry(0.0715, 0.005, 6, 28), M.plastic(0x14171c, 0.8), dx, 0, 0);
      gr.rotation.y = Math.PI / 2;
      gr.userData.noEdges = true;
      damper.add(gr);
    }
    const reluctor = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.007, 24), dark, -0.019, 0, 0);
    reluctor.rotation.z = Math.PI / 2;
    reluctor.userData.noEdges = true;
    damper.add(reluctor);
    damper.add(mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.016, 6), steel, 0.021, 0, 0));
    root.add(damper);
    refs.damper = damper;
    // 发电机（机体 + 皮带轮）
    const altBody = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.065, 16), aluMid, 0.3725, 0.40, 0.14);
    altBody.rotation.z = Math.PI / 2;
    root.add(altBody);
    for (let k = 0; k < 8; k++) {              // 散热筋
      const a = k / 8 * TAU;
      const fin = mesh(new THREE.BoxGeometry(0.062, 0.006, 0.010), aluMid,
        0.3725, 0.40 + 0.052 * Math.cos(a), 0.14 + 0.052 * Math.sin(a));
      fin.rotation.x = -a;
      fin.userData.noEdges = true;
      root.add(fin);
    }
    const altPulley = makeSprocket(0.038, 0.024, steel, 14, 0);
    altPulley.position.set(0.418, 0.40, 0.14);
    root.add(altPulley);
    refs.pulleys.push({ m: altPulley, ratio: 0.078 / 0.038 });
    // 空调压缩机（机体 + 离合器盘）
    const acBody = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 16), dark, 0.37, 0.14, -0.16);
    acBody.rotation.z = Math.PI / 2;
    root.add(acBody);
    const acPulley = makeSprocket(0.054, 0.024, aluMid, 18, 0);
    acPulley.position.set(0.418, 0.14, -0.16);
    root.add(acPulley);
    refs.pulleys.push({ m: acPulley, ratio: 0.078 / 0.054 });
    // 张紧轮 + 液压张紧器
    const accTensioner = makeSprocket(0.027, 0.020, steel, 12, 0);
    accTensioner.position.set(0.418, 0.345, -0.045);
    root.add(accTensioner);
    refs.pulleys.push({ m: accTensioner, ratio: 0.078 / 0.027 });
    root.add(mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.05, 10), steel, 0.375, 0.38, -0.04));
    const accArm = mesh(new THREE.BoxGeometry(0.02, 0.055, 0.03), ironDark, 0.405, 0.365, -0.042);
    accArm.rotation.z = -0.4;
    accArm.userData.noEdges = true;
    root.add(accArm);
    // 多楔带（曲轴 → 空调压缩机 → 张紧轮 → 发电机 闭环）
    root.add(buildBelt([
      { y: 0.14, z: -0.16, r: 0.054 },
      { y: 0.345, z: -0.045, r: 0.027 },
      { y: 0.40, z: 0.14, r: 0.038 },
      { y: CRANK_Y, z: 0, r: 0.078 }
    ], 0.418, 0.017, 0.0022, beltMatA));
    addEdges(root, 42);
    P(root, { name: '前端附件驱动系统', en: 'Front Accessory Drive', role: 'internal',
      desc: '曲轴减振轮经多楔带驱动发电机与空调压缩机，张紧轮自动补偿皮带伸长；水泵则由正时皮带驱动。扭转减振器内部的橡胶层吸收曲轴扭振，保护皮带与附件轴承不被共振破坏。' },
      [1.55, -0.05, 0.35]);
  }

  /* ================= 19. 飞轮与离合器 ================= */
  {
    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.position.set(0, CRANK_Y, 0);
    root.add(spin);
    const fw = M.metal(0x9aa5b1, 0.36, 0.9);
    const disc = mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.030, 44), fw, -0.338, 0, 0);
    disc.rotation.z = Math.PI / 2;
    spin.add(disc);
    for (let k = 0; k < 44; k++) {             // 起动机齿圈
      const a = k / 44 * TAU;
      const tooth = mesh(new THREE.BoxGeometry(0.020, 0.014, 0.022), ironDark,
        -0.338, 0.140 * Math.cos(a), 0.140 * Math.sin(a));
      tooth.rotation.x = -a;
      tooth.userData.noEdges = true;
      spin.add(tooth);
    }
    const friction = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.012, 32), M.plastic(0x2a2622, 0.75), -0.359, 0, 0);
    friction.rotation.z = Math.PI / 2;
    spin.add(friction);
    const pp = mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.018, 36), fw, -0.374, 0, 0); // 压盘
    pp.rotation.z = Math.PI / 2;
    spin.add(pp);
    for (let k = 0; k < 6; k++) {              // 离合器压板螺栓
      const a = k / 6 * TAU;
      spin.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 6), steel,
        -0.385, 0.052 * Math.cos(a), 0.052 * Math.sin(a)));
    }
    for (let k = 0; k < 6; k++) {              // 飞轮固定螺栓
      const a = k / 6 * TAU + 0.5;
      spin.add(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.018, 6), dark,
        -0.316, 0.048 * Math.cos(a), 0.048 * Math.sin(a)));
    }
    addEdges(spin, 42);
    P(root, { name: '飞轮与离合器', en: 'Flywheel & Clutch', role: 'internal',
      desc: '飞轮以大惯量帮曲轴平稳度过非做功冲程，外圈齿圈供起动机小齿轮啮合。摩擦盘被膜片弹簧压盘压紧在飞轮摩擦面上传递扭矩，半离合时的滑磨正是手动挡起步与降挡补油的物理基础。' },
      [-1.5, 0, -0.35]);
    refs.flywheel = spin;
  }

  /* ================= 20. 机油滤清器与机油尺 ================= */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 14), aluMid, 0.24, 0.12, 0.149)); // 安装座
    const filter = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.10, 16), M.metal(0x4a6a78, 0.45, 0.6), 0.24, 0.12, 0.205);
    filter.rotation.x = Math.PI / 2;
    root.add(filter);
    root.add(mesh(new THREE.CylinderGeometry(0.037, 0.033, 0.012, 16), dark, 0.24, 0.12, 0.258));
    // 机油尺（黄色拉环）
    root.add(tube([
      new THREE.Vector3(0.29, 0.22, 0.148),
      new THREE.Vector3(0.315, 0.30, 0.152),
      new THREE.Vector3(0.33, 0.38, 0.148)
    ], 0.0035, steel, 12));
    const loop = mesh(new THREE.TorusGeometry(0.017, 0.005, 8, 18), M.plastic(0xd8a018, 0.5), 0.336, 0.415, 0.148);
    loop.rotation.y = Math.PI / 2;
    loop.userData.noEdges = true;
    root.add(loop);
    addEdges(root, 44);
    P(root, { name: '机油滤清器与机油尺', en: 'Oil Filter & Dipstick', role: 'internal',
      desc: '机油滤清器旋装在缸体左前侧，全流式滤芯过滤送往轴瓦与凸轮轴的机油。机油尺经缸体侧导管插入油底壳，黄色拉环是 JDM 引擎舱的经典识别点，冷态液面应位于刻度上下限之间。' },
      [0.9, -0.4, 0.95]);
  }

  /* ================= 参数 ================= */
  const params = [
    { id: 'rpm', label: '目标转速', type: 'range', min: 0, max: 7000, step: 100, value: 600, unit: ' rpm' },
    { id: 'boost', label: '增压压力', type: 'range', min: 0, max: 1.3, step: 0.05, value: 0, unit: ' bar' },
    { id: 'ghost', label: '缸体透视', type: 'toggle', value: false }
  ];

  const state = { theta: 0, omega: 0, boost: 0, turbo: 0, ghost: false };
  const COLD = new THREE.Color(0x2a0906), HOT = new THREE.Color(0xff7222);

  function update(dt, t, p, ctx) {
    dt = Math.min(dt || 0.016, 0.05);
    // 曲轴：视觉转速上限避免频闪，缓动逼近目标
    const targetOmega = Math.min((p.rpm || 0) / 60 * TAU, 20);
    state.omega += (targetOmega - state.omega) * Math.min(1, dt * 2.2);
    state.theta = (state.theta + state.omega * dt) % (4 * Math.PI);

    // 增压迟滞 + 涡轮转速（叶轮与增压压力联动）
    state.boost += ((p.boost || 0) - state.boost) * Math.min(1, dt * 1.5);
    const turboTarget = Math.min(230, state.boost / 1.3 * 190 + (p.rpm || 0) / 7000 * 55);
    state.turbo += (turboTarget - state.turbo) * Math.min(1, dt * 2.0);
    for (const w of refs.turboWheels) w.rotation.z -= state.turbo * dt;

    // 曲轴系联动
    refs.crank.rotation.x = state.theta;
    refs.flywheel.rotation.x = state.theta;
    refs.damper.rotation.x = state.theta;
    refs.crankSprocket.rotation.x = state.theta;
    for (const s of refs.camSprockets) s.rotation.x = state.theta / 2;      // 凸轮 1:2 减速
    for (const o of refs.pulleys) o.m.rotation.x = state.theta * o.ratio;   // 皮带轮按半径反比
    for (const o of refs.lobes) o.m.rotation.x = Math.PI + (state.theta + o.base) / 2;

    // 曲柄连杆精确运动学：y = r·cosθ + √(L²−r²sin²θ)，连杆摆角 asin(r·sinθ/L)
    for (let i = 0; i < 6; i++) {
      const a = state.theta + PHASE[i];
      const s = Math.sin(a), c = Math.cos(a);
      const root2 = Math.sqrt(L * L - R * R * s * s);
      refs.pistons[i].position.y = R * c + root2;
      refs.rods[i].position.set(0, R * c, R * s);
      refs.rods[i].rotation.x = Math.atan2(-R * s, root2);
    }

    // 气门升程（720° 循环相位：排气峰 270° / 进气峰 450°，约 70° 气门重叠）
    const dur = 250 * DEG;
    for (const v of refs.valves) {
      const peak = v.intake ? 2.5 * Math.PI : 1.5 * Math.PI;
      let u = (state.theta + PHASE[v.i] - peak) % (4 * Math.PI);
      if (u < 0) u += 4 * Math.PI;
      if (u > 2 * Math.PI) u -= 4 * Math.PI;
      const lift = Math.pow(Math.max(0, Math.cos(Math.PI * u / dur)), 1.5) * 0.008;
      v.g.position.y = v.y0 - lift;
      v.spring.scale.y = 1 - lift / 0.074;
    }

    // 排气侧热辐射：由暗红到亮橙红（转速 + 增压共同决定）
    const heat = Math.min(1,
      (p.rpm || 0) / 7000 * 0.55 + state.boost / 1.3 * 0.55 + (ctx && ctx.night ? 0.06 : 0));
    glowMat.emissiveIntensity = 0.10 + heat * 1.6;
    glowMat.emissive.copy(COLD).lerp(HOT, heat);

    // 缸体透视
    const g = !!p.ghost;
    if (state.ghost !== g) {
      state.ghost = g;
      for (const m of refs.ghostMats) {
        m.transparent = g;
        m.opacity = g ? 0.26 : 1;
        m.depthWrite = !g;
        m.needsUpdate = true;
      }
    }
  }

  return {
    group, parts, params, update,
    hud: () => {
      const deg = Math.round((state.theta / DEG) % 720);
      const visRpm = Math.round(state.omega / TAU * 60);
      const turboK = (state.turbo / 230 * 16.8).toFixed(1);
      return `2JZ-GTE · 曲轴 ${deg}° · 视觉 ${visRpm} rpm · 增压 ${state.boost.toFixed(2)} bar · 涡轮 ${turboK} 万 rpm · 点火 1-5-3-6-2-4`;
    }
  };
}
