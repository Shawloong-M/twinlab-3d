// ============ 空客 A380-800 —— 1:1 程序化建模 ============
// 真实尺寸：全长 72.72m / 翼展 79.75m / 总高 24.09m
// 机身卵形截面：宽 7.14m × 高 8.41m（上下双层甲板）；4 发翼吊；起落架 22 轮
// 坐标系：机头 +X，地面 y=0，机身中轴 y=6.2，左翼 +Z
import * as THREE from 'three';
import { M, part, mesh, addEdges, loftSections, superellipsePts, airfoilPts, roundedBox } from '../lib.js';

const SPAN = 39.875;                            // 半翼展
const YC = 6.2;                                 // 机身中轴离地高
const SWEEP = Math.tan(33.5 * Math.PI / 180);   // 机翼后掠（LE）

export function buildAirplane() {
  const group = new THREE.Group();
  const parts = [];
  const refs = { engines: [], gears: [], flaps: [], windowMat: null };

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };
  const white = () => M.paint(0xf3f5f7, { envMapIntensity: 1.0 });
  const blue = () => M.paint(0x14417e);
  const grey = () => M.paint(0xd7dde3);
  const metal = () => M.metal(0x8b939d, 0.38, 0.85);

  /* ================= 机身（卵形双层截面放样，短钝鼻 + 上翘尾锥） ================= */
  {
    const root = new THREE.Group();
    // [x, 半宽, 半高, 中轴偏移]
    const st = [
      [36.30, 0.10, 0.10, -0.85],
      [35.10, 0.90, 1.00, -0.35],
      [33.00, 1.80, 2.20, 0.05],
      [29.60, 2.80, 3.40, 0.15],
      [25.00, 3.35, 4.05, 0.10],
      [20.00, 3.57, 4.20, 0.00],
      [8.00, 3.57, 4.20, 0.00],
      [-10.0, 3.57, 4.20, 0.00],
      [-16.0, 3.57, 4.20, 0.00],
      [-21.0, 3.50, 4.10, 0.25],
      [-25.5, 3.10, 3.60, 0.85],
      [-29.5, 2.45, 2.85, 1.55],
      [-33.0, 1.65, 1.95, 2.25],
      [-35.2, 0.80, 0.95, 2.75],
      [-36.36, 0.10, 0.12, 3.05]
    ].map(([x, rw, rh, cy]) => ({
      pos: [x, 0, 0], side: [0, 0, 1], up: [0, 1, 0],
      pts: superellipsePts(rw, rh, 22, 2.45, 2.3, cy)
    }));
    const fus = loftSections(st, { material: white() });
    fus.position.y = YC;
    root.add(fus);
    // 驾驶舱风挡（A380 标志性位于双层之间的高位前视窗，5 块面板）
    const wsM = M.glass(0x0d141b, 0.82);
    for (let i = 0; i < 5; i++) {
      const z = (i - 2) * 0.62;
      const w = Math.cos(Math.abs(z) / 1.7) * 0.56 + 0.05;
      const px = 31.55 - Math.abs(z) * 0.13;
      const py = YC + 1.72 - Math.abs(z) * 0.09;
      const p = mesh(new THREE.BoxGeometry(0.10, 0.62, w), wsM, px, py, z);
      p.rotation.z = 0.52;
      p.rotation.x = z * 0.06;
      p.userData.noEdges = true;
      root.add(p);
    }
    addEdges(root, 40);
    P(root, { name: '机身', en: 'Fuselage', role: 'structure',
      desc: 'A380 机身宽 7.14m、高 8.41m，卵形截面由上下两个气泡舱拼接：主甲板与上层甲板构成全球唯一量产双层客机。蒙皮为铝锂合金与 GLARE 纤维金属层板混合使用，比传统铝减重 10% 并提升疲劳寿命。' },
      [0, 3.2, 0]);
  }

  /* ================= 雷达罩 ================= */
  {
    const root = new THREE.Group();
    const nose = mesh(new THREE.SphereGeometry(1.02, 20, 14), grey(), 36.05, YC - 0.75, 0);
    nose.scale.set(1.9, 1.0, 1.0);
    root.add(nose);
    addEdges(root, 40);
    P(root, { name: '雷达罩', en: 'Radome', role: 'shell',
      desc: '鼻锥雷达罩由石英纤维复合材料制成，对 X 波段透过率超过 90%，保护内部气象雷达与地形测绘天线。锥面经防静电涂层处理并预留防雨蚀套。' },
      [2.2, 0.3, 0]);
  }

  /* ================= 客舱舷窗（双层两排 · InstancedMesh） ================= */
  {
    const root = new THREE.Group();
    const winM = new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.25, metalness: 0.1 });
    const geo = new THREE.BoxGeometry(0.07, 0.42, 0.30);
    const rows = [
      { y: YC + 0.62, z: 3.555, x0: 27.5, x1: -19.0 },   // 主甲板
      { y: YC + 2.62, z: 3.10, x0: 24.5, x1: -19.0 }     // 上层甲板
    ];
    let count = 0;
    for (const r of rows) count += Math.floor((r.x0 - r.x1) / 0.98) * 2;
    const inst = new THREE.InstancedMesh(geo, winM, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
    let idx = 0;
    for (const r of rows) {
      const n = Math.floor((r.x0 - r.x1) / 0.98);
      for (let i = 0; i < n; i++) {
        for (const sd of [1, -1]) {
          e.set(0, sd > 0 ? 0 : Math.PI, 0);
          q.setFromEuler(e);
          m4.compose(new THREE.Vector3(r.x0 - i * 0.98, r.y, sd * r.z), q, s);
          inst.setMatrixAt(idx++, m4);
        }
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    refs.windowMat = winM;
    root.add(inst);
    P(root, { name: '客舱舷窗（双层）', en: 'Cabin Windows (2 Decks)', role: 'shell',
      desc: 'A380 每侧上下两排舷窗：主甲板与上层甲板各自独立成排，上层视野更远。舷窗为三层亚克力，中层带排水孔防起雾；舱内 0.6bar 压差下窗体承受环形拉力，故为小圆角大边距设计。' },
      [0, 1.2, 1.5]);
  }

  /* ================= 客舱门（主甲板×3 + 上甲板×3，每侧） ================= */
  {
    const root = new THREE.Group();
    const doorM = M.plastic(0x1a2129, 0.5);
    const doors = [
      [28.0, YC + 0.55, 3.56], [3.5, YC + 0.55, 3.56], [-14.5, YC + 0.55, 3.56],
      [24.0, YC + 2.55, 3.11], [0.0, YC + 2.55, 3.11], [-17.0, YC + 2.55, 3.11]
    ];
    for (const [x, y, z] of doors) {
      for (const sd of [1, -1]) {
        const d = mesh(roundedBox(0.10, 1.88, 0.92, 0.06), doorM, x, y, sd * z);
        d.userData.noEdges = true;
        root.add(d);
      }
    }
    addEdges(root, 40);
    P(root, { name: '客舱门', en: 'Cabin Doors', role: 'shell',
      desc: 'A380 主甲板每侧 3 扇宽体滑梯门、上层甲板 3 扇应急门。门为外开嵌入式塞封设计：舱压把门体压入门框密封带，越加压越密封；开启机构先内旋再外滑，配预展开逃生滑梯。' },
      [0, 0.6, 1.8]);
  }

  /* ================= 主翼（NACA 翼型放样 · 33.5° 后掠 · 5.6° 上反） ================= */
  const WING = [
    //  t,    z,     LE_x,  chord, y,     thick
    [0.00, 0.00, 11.0, 17.7, -1.00, 0.115],
    [0.15, 6.00, 8.10, 15.8, -0.72, 0.11],
    [0.32, 12.80, 4.20, 12.5, -0.38, 0.105],
    [0.58, 23.10, -2.20, 8.60, 0.62, 0.10],
    [0.80, 31.90, -8.50, 6.00, 1.90, 0.09],
    [1.00, 39.87, -15.4, 4.00, 3.90, 0.08]
  ];
  const wingYat = z => {
    let a = WING[0], b = WING[WING.length - 1];
    for (let i = 0; i < WING.length - 1; i++) {
      if (z >= WING[i][1] && z <= WING[i + 1][1]) { a = WING[i]; b = WING[i + 1]; break; }
    }
    const k = (z - a[1]) / Math.max(1e-6, b[1] - a[1]);
    return { le: a[2] + (b[2] - a[2]) * k, y: a[4] + (b[4] - a[4]) * k };
  };
  const buildWing = (sd) => {
    const root = new THREE.Group();
    const stations = WING.map(([t, z, le, c, y, th]) => ({
      pos: [le + c / 2, YC + y, sd * z], side: [1, 0, 0], up: [0, 1, 0],
      pts: airfoilPts(18, th, 0.018).map(([u, v]) => [(u - 0.5) * c, v * c])
    }));
    const mtl = white();
    mtl.side = THREE.DoubleSide;
    root.add(loftSections(stations, { material: mtl }));
    // 翼梢翼刀（A380 独有上下双叉小翼）
    const tipLE = -15.4, tipY = YC + 3.9;
    for (const up of [1, -1]) {
      const h = up > 0 ? 2.35 : 1.55;
      const fin = mesh(roundedBox(2.6 + (up > 0 ? 0.4 : 0), h, 0.16, 0.05), white(),
        tipLE - 0.4, tipY + up * h / 2, sd * (SPAN - 0.05));
      fin.rotation.z = up * 0.10;
      fin.rotation.x = sd * 0.06;
      root.add(fin);
    }
    addEdges(root, 40);
    P(root, { name: sd > 0 ? '右主翼' : '左主翼', en: 'Main Wing', role: 'structure',
      desc: '翼展 79.75m、翼面积 845㎡：后掠 33.5° 延迟激波产生，5.6° 上反角提供横侧稳定性。蒙皮为铝锂合金，翼尖上下双叉翼刀把翼尖涡推向上下两侧，比传统小翼减阻约 3%。后缘挂四段富勒襟翼与五段扰流板。' },
      [sd * 2.6, 1.5, sd * 1.2]);
  };
  buildWing(1);
  buildWing(-1);

  /* ================= 襟翼（富勒后退式，可偏转） ================= */
  {
    const root = new THREE.Group();
    for (const sd of [1, -1]) {
      for (const [z0, z1, c] of [[3.2, 12.2, 3.6], [13.4, 29.0, 2.6]]) {
        const zm = (z0 + z1) / 2;
        const w0 = wingYat(z0), w1 = wingYat(z1);
        const pivot = new THREE.Group();
        pivot.position.set(w0.le + 17.7 - 5.6, YC + w0.y - 0.35, sd * z0);
        pivot.rotation.order = 'YZX';
        pivot.rotation.y = -sd * Math.atan2((w1.le - w0.le), (z1 - z0));
        const span = Math.hypot(z1 - z0, w1.le - w0.le);
        const plate = mesh(roundedBox(c, 0.24, span, 0.08), white(), 0, 0, span / 2 * 1);
        pivot.add(plate);
        root.add(pivot);
        refs.flaps.push({ pivot });
      }
    }
    addEdges(root, 40);
    P(root, { name: '富勒襟翼', en: 'Fowler Flaps', role: 'structure',
      desc: '后缘富勒襟翼放下时既增大翼型弯度又后退增加翼面积，升力系数最高提升约 90%：进近 40° 襟翼让 560t 的机体把进近速度压到 250km/h 以内。起飞用小角度减阻力，着陆全放配合扰流板卸升。' },
      [0, -1.2, 0]);
  }

  /* ================= 襟翼滑轨整流罩 + 翼身整流罩 ================= */
  {
    const root = new THREE.Group();
    for (const sd of [1, -1]) {
      for (const zt of [5.2, 10.2, 16.4, 24.0]) {
        const w = wingYat(zt);
        const wx = w.le + 6.0;
        const fair = mesh(new THREE.CapsuleGeometry(0.55, 4.6, 6, 12), white(), wx, YC + w.y - 0.75, sd * zt);
        fair.rotation.x = Math.PI / 2;
        root.add(fair);
      }
    }
    const belly = mesh(new THREE.SphereGeometry(1, 20, 14), white(), -1.5, YC - 3.3, 0);
    belly.scale.set(9.5, 1.5, 4.1);
    root.add(belly);
    addEdges(root, 40);
    P(root, { name: '整流罩组', en: 'Fairings', role: 'structure',
      desc: '襟翼滑轨整流罩把滑轨与滚轮机构包入流线体外壳，避免凸出物扰乱机翼下表面气流；翼身整流罩平滑衔接机翼与机身下表面的压力干扰区，并容纳主起落架舱与中央油箱管路。' },
      [0, -1.6, 1.0]);
  }

  /* ================= 发动机 ×4（GP7270 风扇 Ø3.25m） ================= */
  const buildEngine = (sd, zEng, label) => {
    const w = wingYat(zEng);
    const ex = w.le - 2.6;
    const ey = YC + w.y - 2.55;
    const root = new THREE.Group();
    const cowlM = white();
    cowlM.side = THREE.DoubleSide;
    const cowl = mesh(new THREE.CylinderGeometry(1.62, 1.5, 4.4, 26, 1, true), cowlM, 0, 0, 0);
    cowl.rotation.z = Math.PI / 2;
    root.add(cowl);
    const lip = mesh(new THREE.TorusGeometry(1.58, 0.17, 12, 26), blue(), 2.2, 0, 0);
    lip.rotation.y = Math.PI / 2;
    lip.userData.noEdges = true;
    root.add(lip);
    // 风扇叶轮 ×22 + 整流锥
    const fan = new THREE.Group();
    fan.position.set(1.45, 0, 0);
    const bladeM = M.metal(0x6d7884, 0.4, 0.8);
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2;
      const b = mesh(new THREE.BoxGeometry(0.06, 2.55, 0.34), bladeM, 0, 0, 0);
      b.rotation.x = a;
      b.rotateY(0.42);
      b.translateY(1.15);
      b.userData.noEdges = true;
      fan.add(b);
    }
    const spinner = mesh(new THREE.ConeGeometry(0.42, 0.95, 16), M.plastic(0x272d34, 0.4), 0.42, 0, 0);
    spinner.rotation.z = -Math.PI / 2;
    fan.add(spinner);
    root.add(fan);
    refs.engines.push(fan);
    // 核心机短舱 + 尾喷锥
    const core = mesh(new THREE.CylinderGeometry(1.02, 0.88, 2.6, 20), grey(), -2.6, 0, 0);
    core.rotation.z = Math.PI / 2;
    root.add(core);
    const cone = mesh(new THREE.ConeGeometry(0.55, 1.7, 16), metal(), -4.6, 0, 0);
    cone.rotation.z = Math.PI / 2;
    root.add(cone);
    // 挂架
    root.add(mesh(new THREE.BoxGeometry(3.6, 1.35, 0.34), white(), -0.4, 2.0, 0));
    root.position.set(ex, ey, sd * zEng);
    addEdges(root, 40);
    P(root, { name: `${label}发动机`, en: 'Engine Alliance GP7270', role: 'core',
      desc: 'GP7270 大涵道比涡扇：风扇直径 3.25m，起飞推力 364kN。风扇为钛合金空心宽弦叶轮，涵道比 8.7 把核心机喷流噪声大幅稀释；短舱反推装置用 cascade 式把风扇气流折向前方缩短着陆滑跑。' },
      [0.4, -1.6, sd * 1.4]);
  };
  buildEngine(1, 12.8, '右内侧');
  buildEngine(-1, 12.8, '左内侧');
  buildEngine(1, 23.1, '右外侧');
  buildEngine(-1, 23.1, '左外侧');

  /* ================= 垂直尾翼（蓝色涂装） ================= */
  {
    const root = new THREE.Group();
    const st = [
      [10.30, -23.0, 11.0],
      [15.00, -26.6, 8.6],
      [19.40, -29.7, 6.2],
      [23.40, -32.3, 4.4]
    ].map(([y, le, c]) => ({
      pos: [le + c / 2, y, 0], side: [1, 0, 0], up: [0, 0, 1],
      pts: airfoilPts(14, 0.10, 0).map(([u, v]) => [(u - 0.5) * c, v * c])
    }));
    const mtl = blue();
    mtl.side = THREE.DoubleSide;
    root.add(loftSections(st, { material: mtl }));
    // 简化飘带装饰（无文字商标）
    const stripe = mesh(new THREE.BoxGeometry(9.4, 3.2, 0.06), M.paint(0xd8e4f2), -29.2, 15.6, 0);
    stripe.rotation.z = 0.30;
    stripe.userData.noEdges = true;
    root.add(stripe);
    addEdges(root, 40);
    P(root, { name: '垂直尾翼', en: 'Vertical Stabilizer', role: 'structure',
      desc: '高约 13m 的垂直尾翼提供航向稳定与偏航控制：碳纤维复合材料主承力梁贯穿根部，方向舵分上下两段，单发失效时全偏舵平衡 560t 机体的偏航力矩。涂装区为双层聚氨酯漆。' },
      [0, 2.0, 0]);
  }

  /* ================= 水平尾翼 ================= */
  {
    const root = new THREE.Group();
    const mtl = white();
    mtl.side = THREE.DoubleSide;
    for (const sd of [1, -1]) {
      const st = [
        [0.0, -27.5, 7.6, 8.30],
        [7.6, -30.6, 5.4, 8.75],
        [15.2, -33.5, 2.8, 9.30]
      ].map(([z, le, c, y]) => ({
        pos: [le + c / 2, y, sd * z], side: [1, 0, 0], up: [0, 1, 0],
        pts: airfoilPts(12, 0.09, -0.015).map(([u, v]) => [(u - 0.5) * c, v * c])
      }));
      root.add(loftSections(st, { material: mtl }));
    }
    addEdges(root, 40);
    P(root, { name: '水平尾翼', en: 'Horizontal Stabilizer', role: 'structure',
      desc: '平尾翼展 30.4m：配平升力与机翼升力形成俯仰力矩平衡，重心移动靠升降舵连续配平。复合材料蒙皮，燃油在配平油箱间转移可减少配平阻力约 1.5%。' },
      [0, 1.2, 0]);
  }

  /* ================= 起落架（前 2 + 翼下 4×2 + 机身 6×2 = 22 轮） ================= */
  const wheelGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.52, 18);
  const buildWheel = (parent, x, y, z) => {
    const w = mesh(wheelGeo, M.rubber(0x14161a), x, y, z);
    w.rotation.x = Math.PI / 2;
    parent.add(w);
    const hub = mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.54, 12), M.brushed(0xb9c2cc), x, y, z);
    hub.rotation.x = Math.PI / 2;
    parent.add(hub);
  };
  const buildGear = (name, desc, x, z, axles, explode) => {
    const root = new THREE.Group();
    const strut = new THREE.Group();
    const strutM = M.metal(0x9aa3ad, 0.35, 0.85);
    strut.add(mesh(new THREE.CylinderGeometry(0.16, 0.13, YC - 4.2 + 1.35, 12), strutM, 0, 0, 0));
    for (let a = 0; a < axles; a++) {
      const ax = (a - (axles - 1) / 2) * 1.62;
      strut.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.35, 10), strutM, ax, -0.05, 0));
      for (const sd of [1, -1]) buildWheel(strut, ax, 0.02, sd * 0.42);
    }
    strut.position.set(x, 1.42, z);
    root.add(strut);
    refs.gears.push({ strut });
    addEdges(root, 42);
    P(root, { name, en: 'Landing Gear', role: 'core', desc, explode });
  };
  buildGear('前起落架', '双轮前起落架：转弯由液压作动筒驱动可偏转 ±70°，减震支柱充氮气-油液，吸收接地瞬时约 2.5g 撞击。',
    29.0, 0, 1, [1.5, -1.2, 0]);
  buildGear('翼主起落架（左）', '四轮小车式主起落架：双轴四轮分担载荷，轮距布置让刹车能量均匀分布到 4 个碳盘。',
    3.5, 5.3, 2, [-0.6, -1.5, 1.4]);
  buildGear('翼主起落架（右）', '与左翼对称的四轮小车，收放作动筒把支柱旋转 90° 收入翼根整流罩舱内。',
    3.5, -5.3, 2, [-0.6, -1.5, -1.4]);
  buildGear('机身主起落架（左）', '六轮小车式机身主起落架是 A380 独有布局：三轴六轮把 560t 最大起飞重量分散到道面，满足机场道面强度限制。',
    -7.5, 2.35, 3, [-1.0, -1.5, 0.8]);
  buildGear('机身主起落架（右）', '与左侧对称的六轮小车，胎压监测与刹车温度传感实时回传 EICAS。',
    -7.5, -2.35, 3, [-1.0, -1.5, -0.8]);

  /* ================= APU 尾喷口 ================= */
  {
    const root = new THREE.Group();
    const apu = mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.8, 12), metal(), -36.1, YC + 3.05, 0);
    apu.rotation.z = Math.PI / 2;
    root.add(apu);
    addEdges(root, 40);
    P(root, { name: 'APU 排气口', en: 'APU Exhaust', role: 'internal',
      desc: '尾部辅助动力单元（APU）：地面供电供气与空中应急动力，排气口带钛合金隔热罩。A380 的 APU 功率是单通道客机的两倍，用于启动四台主发与双层客舱环控。' },
      [-1.5, 0.8, 0]);
  }

  /* ================= 参数 ================= */
  const params = [
    { id: 'thrust', label: '引擎推力', type: 'range', min: 0, max: 100, step: 1, value: 35, unit: ' %' },
    { id: 'flap', label: '襟翼角度', type: 'range', min: 0, max: 40, step: 1, value: 0, unit: '°' },
    { id: 'gearDown', label: '起落架收放', type: 'toggle', value: true }
  ];

  const state = { fan: 0, flap: 0, gear: 1 };

  function update(dt, t, p, ctx) {
    state.fan += dt * (2 + p.thrust * 0.62);
    for (const f of refs.engines) f.rotation.x = state.fan;
    const fTarget = p.flap * Math.PI / 180 * 0.82;
    state.flap += (fTarget - state.flap) * Math.min(1, dt * 2.2);
    for (const f of refs.flaps) f.pivot.rotation.x = state.flap;
    const gTarget = p.gearDown ? 1 : 0;
    state.gear += (gTarget - state.gear) * Math.min(1, dt * 1.6);
    for (const g of refs.gears) {
      g.strut.rotation.z = (1 - state.gear) * 1.62;
      g.strut.visible = state.gear > 0.02;
    }
    const night = !!ctx?.night;
    refs.windowMat.emissive.setHex(0x3d5a78);
    refs.windowMat.emissiveIntensity = night ? 0.85 : 0.0;
  }

  return {
    group, parts, params, update,
    hud: () => `A380-800 · N1 ${Math.round(18 + params[0].value * 0.82)} % · 襟翼 ${params[1].value}° · 起落架 ${params[2].value ? '放下' : '收起'}`
  };
}
