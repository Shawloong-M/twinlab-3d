// ============ 保时捷 911 (992) Carrera —— 1:1 程序化建模 ============
// 真实尺寸：长 4.519m / 宽 1.852m / 高 1.300m / 轴距 2.450m
// 前 245/40 R19（外径 0.338m），后 295/35 R20（外径 0.357m），后置水平对置六缸 + 8 速 PDK
// 坐标系：车头 +X，地面 y=0，左侧 +Z
import * as THREE from 'three';
import {
  M, part, mesh, addEdges, roundedBox, loftSections, superellipsePts,
  sweepTube, boneBetween, tube, DEG
} from '../lib.js';

const PAINT = 0x1560a8;               // 迈阿密蓝
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 车轮定位：前轴 x=+1.40，后轴 x=-1.05（轴距 2.45），前轮 R0.338 / 后轮 R0.357
const AXLE_F = 1.40, AXLE_R = -1.05;
const R_F = 0.338, R_R = 0.357;       // 轮胎滚动半径（触地：轮心 y = 半径）
const WING_PIVOT = { x: -1.92, y: 0.862 };

/** 轮拱开孔：上段圆弧 + 底部弦线封闭（保证孔完全落在轮廓内部） */
function archHole(cx, cy, r, yFloor) {
  const aR = Math.asin((yFloor - cy) / r);       // 右下交点角（负值）
  const aL = Math.PI - aR;                       // 左下交点角
  const p = new THREE.Path();
  p.moveTo(cx + r * Math.cos(aR), cy + r * Math.sin(aR));
  p.absarc(cx, cy, r, aR, aL, false);            // 逆时针越过拱顶
  p.closePath();                                  // 底部弦线
  return p;
}

export function buildCar() {
  const group = new THREE.Group();
  const parts = [];
  const refs = { wheels: [], doors: [] };

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };

  /* ================= 1. 车身外壳（下车体 + 轮拱开孔 + 翼子板 flare） ================= */
  {
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    const dark = M.plastic(0x14171b, 0.6);

    // 侧面轮廓（已内缩 0.03 补偿 bevel 外扩；slab 面即最终侧影）
    const outline = [
      [2.16, 0.155], [2.21, 0.28], [2.205, 0.47], [2.17, 0.585], [1.90, 0.65],
      [1.55, 0.71], [1.28, 0.755], [0.95, 0.765], [0.55, 0.775], [0.0, 0.785],
      [-0.60, 0.80], [-1.05, 0.845], [-1.45, 0.865], [-1.85, 0.845], [-2.10, 0.80],
      [-2.21, 0.755], [-2.215, 0.52], [-2.21, 0.30], [-2.15, 0.16],
      [-1.40, 0.145], [0.0, 0.14], [1.40, 0.145]
    ];
    const s = new THREE.Shape();
    s.moveTo(...outline[0]);
    for (let i = 1; i < outline.length; i++) s.lineTo(...outline[i]);
    s.closePath();
    s.holes.push(archHole(AXLE_F, 0.34, 0.39, 0.16));
    s.holes.push(archHole(AXLE_R, 0.357, 0.41, 0.16));
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.56, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03,
      bevelSegments: 3, curveSegments: 20
    });
    geo.translate(0, 0, -0.78);
    // 宽度渐变（中段最宽、前后收窄）+ 肩线以上 tumblehome 内收，消除平板砖块感
    {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = THREE.MathUtils.clamp(x / 2.21, -1, 1);
        let k = 1.0 - 0.18 * t * t;                 // 两端收窄 18%
        if (y > 0.55) k *= 1 - (y - 0.55) * 0.35;   // 肩线上部内收
        pos.setZ(i, z * k);
      }
      geo.computeVertexNormals();
    }
    root.add(mesh(geo, paint));

    // 前后翼子板 flare（992 后翼子板明显更宽更饱满）
    for (const sz of [1, -1]) {
      const ff = mesh(new THREE.TorusGeometry(0.40, 0.05, 10, 26, 3.84), paint, AXLE_F, 0.34, sz * 0.775);
      ff.rotation.z = -0.35; ff.scale.set(1.15, 1, 2.4);
      ff.userData.noEdges = true;
      root.add(ff);
      const fr = mesh(new THREE.TorusGeometry(0.43, 0.068, 10, 26, 3.84), paint, AXLE_R, 0.357, sz * 0.76);
      fr.rotation.z = -0.35; fr.scale.set(1.18, 1, 2.2);
      fr.userData.noEdges = true;
      root.add(fr);
    }
    // 侧裙
    for (const sz of [1, -1]) {
      root.add(mesh(new THREE.BoxGeometry(2.30, 0.05, 0.03), dark, 0.08, 0.165, sz * 0.792));
    }
    addEdges(root, 38);
    P(root, { name: '车身外壳', en: 'Body Shell', role: 'shell',
      desc: '992 承载式车身大量采用铝合金冲压件（前翼子板/车门/前盖）压低前轴载荷，钢制乘员舱笼架保障碰撞安全。腰线以下为下车体，前后轮拱开孔后焊接内衬轮罩，后轮拱之后是 911 标志性饱满后翼子板，整车风阻系数 Cd 0.27。' },
      [0, 1.4, 0]);
    refs.body = root;
  }

  /* ================= 2. 座舱玻璃与飞线车顶（快背一体 greenhouse） ================= */
  {
    const root = new THREE.Group();
    const glassM = M.glass(0x2f4a5e, 0.5);
    const paint = M.paint(PAINT);
    // 沿 X 放样截面：宽度向车尾收窄、高度勾勒飞线，911 无传统三厢台阶
    const stations = [
      [0.62, 0.72, 0.74, 0.80],
      [0.30, 0.70, 0.74, 1.06],
      [0.02, 0.68, 0.74, 1.24],
      [-0.40, 0.66, 0.74, 1.30],
      [-0.90, 0.615, 0.74, 1.21],
      [-1.30, 0.54, 0.74, 1.075],
      [-1.58, 0.40, 0.74, 0.955],
      [-1.72, 0.28, 0.74, 0.905]
    ].map(([x, hw, y0, y1]) => ({
      pos: [x, 0, 0], side: [0, 0, 1], up: [0, 1, 0],
      pts: superellipsePts(hw, (y1 - y0) / 2, 20, 2.2, 3.6, (y0 + y1) / 2)
    }));
    const cabin = loftSections(stations, { material: glassM });
    cabin.userData.noEdges = true;
    root.add(cabin);
    // A 柱与车顶滴水檐（车身色，勾出飞线轮廓）
    for (const sz of [1, -1]) {
      root.add(sweepTube(
        [[0.60, 0.79, sz * 0.655], [0.30, 1.05, sz * 0.665], [0.04, 1.23, sz * 0.62]],
        0.024, { material: paint, radial: 8, segments: 10 }));
      root.add(sweepTube(
        [[0.02, 1.235, sz * 0.61], [-0.40, 1.293, sz * 0.59], [-0.90, 1.20, sz * 0.55],
         [-1.30, 1.065, sz * 0.48], [-1.60, 0.945, sz * 0.36], [-1.71, 0.895, sz * 0.24]],
        0.02, { material: paint, radial: 8, segments: 14 }));
      const bp = mesh(new THREE.BoxGeometry(0.022, 0.34, 0.025), M.plastic(0x111418, 0.4),
        -0.40, 1.00, sz * 0.635);
      bp.rotation.z = -0.16;
      bp.userData.noEdges = true;
      root.add(bp);
    }
    // 车顶金属板：911 flyline 中段为车身色金属顶（玻璃只留前后风挡与侧窗）
    const roofM = M.paint(PAINT, { side: THREE.DoubleSide });
    const roofStations = [
      [0.10, 0.655, 1.243],
      [-0.40, 0.635, 1.304],
      [-0.90, 0.59, 1.214],
      [-1.20, 0.545, 1.118]
    ].map(([x, hw, yTop]) => ({
      pos: [x, 0, 0], side: [0, 0, 1], up: [0, 1, 0],
      pts: Array.from({ length: 9 }, (_, i) => {
        const t = i / 8 * 2 - 1;                       // -1..1 横跨车顶
        return [t * hw, yTop - 0.045 * (1 - t * t)];   // 微拱顶
      })
    }));
    const roofPanel = loftSections(roofStations, { material: roofM, closedLoop: false, capStart: false, capEnd: false });
    roofPanel.userData.noEdges = true;
    root.add(roofPanel);
    addEdges(root, 40);
    P(root, { name: '座舱玻璃与飞线车顶', en: 'Cabin Glass & Flyline Roof', role: 'shell',
      desc: '911 flyline 从风挡经车顶一气呵成滑落到车尾，快背造型让气流贴附至尾翼而不分离。前风挡为 PVB 夹层玻璃破碎不飞溅，侧窗钢化；A 柱与车顶梁为热成型钢，构成侧碰防护框架。' },
      [0, 2.0, 0]);
  }

  /* ================= 3. 前备箱盖（frunk） ================= */
  {
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    const dark = M.plastic(0x14171b, 0.6);
    const seam = mesh(new THREE.BoxGeometry(1.00, 0.014, 1.04), dark, 1.30, 0.750, 0);
    seam.rotation.z = -0.10;
    root.add(seam);
    const lid = mesh(roundedBox(0.96, 0.02, 1.00, 0.008), paint, 1.30, 0.761, 0);
    lid.rotation.z = -0.10;
    root.add(lid);
    addEdges(root, 40);
    P(root, { name: '前备箱盖', en: 'Front Luggage Compartment Lid', role: 'shell',
      desc: '后置引擎把行李舱留在了车头：铝合金前盖内藏 132L frunk 与压缩备胎位。盖板与前围的分缝经激光焊接保证缝隙均匀，开启时由气压撑杆支撑并预留行人保护抬升空间。' },
      [0.5, 1.3, 0]);
  }

  /* ================= 4/5. 前车门 ×2（铰链在门框前缘） ================= */
  for (const side of [1, -1]) {           // +1 左 / -1 右
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    root.add(mesh(roundedBox(0.98, 0.44, 0.05, 0.018), paint, -0.49, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(0.96, 0.014, 0.02), M.chrome(0xcfd6de), -0.49, 0.225, side * 0.012));
    root.add(mesh(new THREE.BoxGeometry(0.80, 0.09, 0.015), M.metal(0x5f6a76, 0.5, 0.8), -0.49, -0.02, -side * 0.012));
    root.add(mesh(new THREE.BoxGeometry(0.17, 0.024, 0.018), M.plastic(0x0d0f12, 0.4), -0.32, 0.115, side * 0.027));
    root.position.set(0.55, 0.575, side * 0.808);
    root.userData.side = side;
    addEdges(root, 40);
    P(root, { name: side > 0 ? '左前车门' : '右前车门', en: 'Front Door', role: 'shell',
      desc: '铝制车门内藏超高强度防撞钢梁、玻璃升降模块与侧气帘。992 采用无框车窗：开门瞬间玻璃自动下落 5mm 再升起，避免刮伤密封条；铰链限位器让门停在任意开度。' },
      [0.25, 0.3, side * 1.35]);
    refs.doors.push(root);
  }

  /* ================= 6. 后引擎盖散热格栅（垂直百叶） ================= */
  {
    const root = new THREE.Group();
    const dark = M.plastic(0x16191d, 0.55);
    const panel = mesh(new THREE.BoxGeometry(0.20, 0.014, 0.84), dark, -1.82, 0.868, 0);
    panel.rotation.z = 0.05;
    root.add(panel);
    for (let i = 0; i < 4; i++) {
      const blade = mesh(new THREE.BoxGeometry(0.013, 0.055, 0.82), dark, -1.745 + i * 0.05, 0.895, 0);
      blade.rotation.z = 0.22;
      blade.userData.noEdges = true;
      root.add(blade);
    }
    root.add(mesh(new THREE.BoxGeometry(0.16, 0.012, 0.90), M.plastic(0x101317, 0.5), -1.70, 0.878, 0));
    addEdges(root, 40);
    P(root, { name: '后引擎盖散热格栅', en: 'Engine Cover Grille', role: 'shell',
      desc: '后窗下方的垂直百叶为后置水平对置六缸引出散热气流，同时把新鲜空气导入进气系统。百叶角度经 CFD 优化：低速排热、高速利用负压抽风，是 911 尾部最有辨识度的细节之一。' },
      [-0.4, 1.4, 0]);
  }

  /* ================= 7. 主动尾翼（可升降） ================= */
  {
    const pivot = new THREE.Group();
    pivot.position.set(WING_PIVOT.x, WING_PIVOT.y, 0);
    const paint = M.paint(PAINT);
    const plank = mesh(roundedBox(0.26, 0.032, 1.64, 0.015), paint, -0.13, 0.005, 0);
    pivot.add(plank);
    pivot.add(mesh(new THREE.BoxGeometry(0.20, 0.006, 1.55), M.plastic(0x14171b, 0.5), -0.13, -0.014, 0));
    pivot.rotation.z = 0.245;                 // 收起时贴合尾甲板坡度
    addEdges(pivot, 40);
    P(pivot, { name: '主动尾翼', en: 'Active Rear Spoiler', role: 'structure',
      desc: '992 标配多段可展开尾翼：120km/h 以上自动升起增加下压力，全力制动时与 ABS 联合姿态立起缩短制动距离，巡航时贴合车身降低风阻。展开角度由 ECU 按车速、横向加速度与驾驶模式实时调节。' },
      [-0.5, 1.8, 0]);
    refs.wingPivot = pivot;
  }

  /* ================= 8. 前保险杠与三段进气口 ================= */
  {
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    const dark = M.plastic(0x14171b, 0.55);
    const chrome = M.chrome(0xd0d6dd);
    root.add(mesh(roundedBox(0.28, 0.36, 1.64, 0.07), paint, 2.12, 0.315, 0));
    root.add(mesh(new THREE.BoxGeometry(0.085, 0.19, 0.94), dark, 2.222, 0.245, 0));
    root.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.90), chrome, 2.268, 0.29, 0));
    root.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.90), chrome, 2.268, 0.20, 0));
    for (const sz of [1, -1]) {
      const si = mesh(new THREE.BoxGeometry(0.075, 0.15, 0.30), dark, 2.215, 0.30, sz * 0.60);
      si.rotation.y = -sz * 0.14;
      root.add(si);
    }
    root.add(mesh(new THREE.BoxGeometry(0.30, 0.04, 1.52), dark, 2.13, 0.115, 0));
    root.add(mesh(new THREE.BoxGeometry(0.012, 0.11, 0.36), dark, 2.268, 0.415, 0));
    addEdges(root, 40);
    P(root, { name: '前保险杠与进气口', en: 'Front Bumper & Air Intakes', role: 'shell',
      desc: '992 前脸中央宽进气口为主水箱导流，两侧进气口为前置中冷器与制动冷却供气，下缘分流器整理车底气流减少前轴升力。杠内集成了 ACC 雷达、前方摄像头与行人保护缓冲梁。' },
      [1.3, 0.2, 0]);
  }

  /* ================= 9. 后保险杠与扩散器 ================= */
  {
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    const dark = M.plastic(0x14171b, 0.55);
    root.add(mesh(roundedBox(0.28, 0.32, 1.60, 0.07), paint, -2.11, 0.30, 0));
    root.add(mesh(new THREE.BoxGeometry(0.30, 0.045, 1.28), dark, -2.15, 0.14, 0));
    for (let i = 0; i < 5; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.22, 0.10, 0.014), dark, -2.19, 0.155, -0.40 + i * 0.20));
    }
    addEdges(root, 40);
    P(root, { name: '后保险杠与扩散器', en: 'Rear Bumper & Diffuser', role: 'shell',
      desc: '后扩散器竖直鳍片加速车底气流、降低后轴升力，为后置引擎的散热器让出导流通道。保险杠集成了后雷达与倒车影像，造型为贯穿式灯带预留了完整的灯带凹槽。' },
      [-1.3, 0.2, 0]);
  }

  /* ================= 10. 前大灯（992 椭圆 LED + 四点式日行灯） ================= */
  {
    const root = new THREE.Group();
    const chrome = M.chrome(0xd6dce3);
    const dark = M.plastic(0x101318, 0.5);
    const lensM = M.glass(0xeaf4ff, 0.22);
    refs.drlMat = M.emis(0xe8f4ff, 1.3, { color: 0xb9c6d2 });
    refs.headMat = M.emis(0xfff6d8, 0.3, { color: 0xb9c2cc });
    for (const sz of [1, -1]) {
      const lamp = new THREE.Group();
      lamp.position.set(2.08, 0.625, sz * 0.615);
      lamp.rotation.y = -sz * 0.38;
      lamp.rotation.z = -sz * 0.10;
      const bezelG = new THREE.TorusGeometry(0.09, 0.014, 8, 22);
      bezelG.rotateY(Math.PI / 2);
      const bezel = mesh(bezelG, chrome, 0, 0, 0);
      bezel.scale.set(1, 1.15, 1.6);
      bezel.userData.noEdges = true;
      lamp.add(bezel);
      const cover = mesh(new THREE.SphereGeometry(0.098, 14, 10), lensM, -0.01, 0, 0);
      cover.scale.set(0.62, 1.1, 1.45);
      cover.userData.noEdges = true;
      lamp.add(cover);
      for (const [dy, dz] of [[0.038, 0.032], [0.038, -0.032], [-0.038, 0.032], [-0.038, -0.032]]) {
        const dot = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10), refs.drlMat, 0.02, dy, dz);
        dot.rotation.z = Math.PI / 2;
        dot.userData.noEdges = true;
        lamp.add(dot);
      }
      const proj = mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.035, 14), refs.headMat, 0.015, -0.005, 0);
      proj.rotation.z = Math.PI / 2;
      lamp.add(proj);
      const back = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.10, 14), dark, -0.055, 0, 0);
      back.rotation.z = Math.PI / 2;
      lamp.add(back);
      root.add(lamp);
    }
    addEdges(root, 40);
    P(root, { name: '前大灯', en: 'LED Headlights', role: 'internal',
      desc: '992 椭圆 LED 大灯内含标志性的四点式日行灯，近光由矩阵 LED 分区点亮，远光可遮蔽对向车道区域避免眩目。弯道照明随转向角与方向盘转角提前偏转，大灯组与翼子板曲面无缝拼接。' },
      [1.1, 0.4, 0]);
  }

  /* ================= 11. 贯穿式 LED 尾灯灯条（992 最强识别特征） ================= */
  {
    const root = new THREE.Group();
    refs.tailMat = M.emis(0xff2a1c, 0.55, { color: 0x4a0b08 });
    root.add(mesh(roundedBox(0.045, 0.052, 1.58, 0.02), refs.tailMat, -2.235, 0.70, 0));
    for (const sz of [1, -1]) {
      const endB = mesh(roundedBox(0.045, 0.10, 0.10, 0.02), refs.tailMat, -2.232, 0.655, sz * 0.745);
      endB.rotation.x = sz * 0.35;
      endB.userData.noEdges = true;
      root.add(endB);
    }
    refs.reverseMat = M.emis(0xe8f2ff, 0.15, { color: 0x30363c });
    for (const sz of [1, -1]) {
      const rl = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 14), refs.reverseMat, -2.248, 0.60, sz * 0.52);
      rl.rotation.z = Math.PI / 2;
      rl.userData.noEdges = true;
      root.add(rl);
    }
    root.add(mesh(new THREE.BoxGeometry(0.012, 0.014, 0.60), M.chrome(0xc9cfd6), -2.252, 0.645, 0));
    addEdges(root, 40);
    P(root, { name: '贯穿式 LED 尾灯', en: 'LED Light Strip', role: 'internal',
      desc: '992 最强识别特征：细长 LED 灯带横贯整个车尾，玻璃光导条把数百颗 LED 折射成无断点的连续光带，集成刹车、夜航与转向功能。灯带端部向下弯折包住车尾圆角，夜间辨识度极高。' },
      [-1.1, 0.5, 0]);
  }

  /* ================= 12-15. 车轮 ×4（前窄后宽，五辐轮毂，打孔盘 + 黄色卡钳） ================= */
  const buildWheel = (x, z, front) => {
    const side = Math.sign(z);
    const R = front ? R_F : R_R;                 // 外径
    const TW = front ? 0.245 : 0.295;            // 胎宽（后轮明显更宽）
    const RR = front ? 0.241 : 0.254;            // 轮辋半径 R19/R20
    const root = new THREE.Group();              // 转向节（部件根）
    const spin = new THREE.Group();              // 滚动旋转组
    root.add(spin);
    const tireM = M.rubber(0x15171a);
    const rimM = M.brushed(0xc9d1da);
    const rimIn = M.metal(0x565e68, 0.35, 0.9, { side: THREE.DoubleSide });
    const discM = M.metal(0x767e88, 0.35, 0.88);
    const calM = M.paint(0xd7b92f);              // 黄色陶瓷复合制动卡钳
    // 轮胎（低扁平比圆截面 torus）
    const tubeR = TW / 2;
    spin.add(mesh(new THREE.TorusGeometry(R - tubeR, tubeR, 14, 36), tireM));
    // 轮辋筒 + 外翻边
    const barrel = mesh(new THREE.CylinderGeometry(RR, RR, TW * 0.8, 24, 1, true), rimIn);
    barrel.rotation.x = Math.PI / 2;
    barrel.userData.noEdges = true;
    spin.add(barrel);
    spin.add(mesh(new THREE.TorusGeometry(RR - 0.006, 0.011, 8, 28), rimM, 0, 0, side * (TW * 0.4 - 0.01)));
    // 五辐条（带厚度与扭转）
    const spokeLen = RR - 0.05;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3;
      const sp = mesh(new THREE.BoxGeometry(0.052, spokeLen, 0.03), rimM,
        Math.cos(a) * (0.05 + spokeLen / 2), Math.sin(a) * (0.05 + spokeLen / 2), side * (TW * 0.5 - 0.028));
      sp.rotation.order = 'ZYX';
      sp.rotation.y = 0.42;
      sp.rotation.z = a;
      sp.userData.noEdges = true;
      spin.add(sp);
    }
    // 轮心盖
    const hub = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 16), rimM, 0, 0, side * (TW * 0.5 - 0.02));
    hub.rotation.x = Math.PI / 2;
    spin.add(hub);
    const cap = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.014, 14), M.chrome(0xdadfe6), 0, 0, side * (TW * 0.5 + 0.005));
    cap.rotation.x = Math.PI / 2;
    spin.add(cap);
    // 打孔制动盘 + 内帽 + 环形盘纹
    const discR = front ? 0.175 : 0.180;
    const disc = mesh(new THREE.CylinderGeometry(discR, discR, 0.024, 28), discM, 0, 0, -side * 0.02);
    disc.rotation.x = Math.PI / 2;
    spin.add(disc);
    const hat = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.03, 18), M.chrome(0xc4cad2), 0, 0, -side * 0.022);
    hat.rotation.x = Math.PI / 2;
    spin.add(hat);
    for (const gr of [discR - 0.035, discR - 0.07]) {
      const groove = mesh(new THREE.TorusGeometry(gr, 0.004, 5, 24), M.plastic(0x2a2e33, 0.8), 0, 0, -side * 0.008);
      groove.userData.noEdges = true;
      spin.add(groove);
    }
    // 黄色卡钳（挂在转向节上，不随车轮转动）
    const calA = front ? 0.62 : -0.72;
    const cal = mesh(roundedBox(0.085, 0.055, 0.105, 0.02), calM,
      Math.cos(calA) * (discR + 0.012), Math.sin(calA) * (discR + 0.012), -side * 0.02);
    cal.rotation.z = calA + Math.PI / 2;
    cal.userData.noEdges = true;
    root.add(cal);
    root.position.set(x, R, z);
    root.userData.spin = spin;
    root.userData.front = front;
    addEdges(root, 42);
    const nm = front ? (side > 0 ? '前左车轮' : '前右车轮') : (side > 0 ? '后左车轮' : '后右车轮');
    P(root, { name: nm, en: front ? 'Front Wheel (245/40 R19)' : 'Rear Wheel (295/35 R20)', role: 'core',
      desc: front
        ? '前轮 245/40 R19：窄胎降低转向阻力并提升转向精度，低扁平比胎壁在转向载荷下变形极小。打孔制动盘通过盘面通孔散热排屑，对向四活塞黄色卡钳（PCCB 陶瓷盘选装）提供稳定制动力。'
        : '后轮 295/35 R20 明显宽于前轮：后置引擎压在驱动桥上，宽胎承接动力与重量、放大机械抓地极限。五辐锻造轮毂辐条带扭转角兼顾散热与刚度，胎压监测直接集成在气门嘴。' },
      [x * 0.32, -0.45, z * 0.95]);
    refs.wheels.push(root);
  };
  buildWheel(AXLE_F, 0.775, true);
  buildWheel(AXLE_F, -0.775, true);
  buildWheel(AXLE_R, 0.76, false);
  buildWheel(AXLE_R, -0.76, false);

  /* ================= 16. 底盘与悬架（前麦弗逊 / 后多连杆） ================= */
  {
    const root = new THREE.Group();
    const dark = M.plastic(0x171a1e, 0.7);
    const alu = M.metal(0x7d8794, 0.42, 0.82);
    root.add(mesh(new THREE.BoxGeometry(3.55, 0.05, 1.42), dark, 0.05, 0.175, 0));
    root.add(mesh(new THREE.BoxGeometry(0.40, 0.07, 1.05), alu, AXLE_F, 0.215, 0));
    root.add(mesh(new THREE.BoxGeometry(0.44, 0.07, 1.05), alu, AXLE_R, 0.215, 0));
    // 转向机 + 拉杆
    const rack = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 10), alu, 1.28, 0.245, 0);
    rack.rotation.x = Math.PI / 2;
    root.add(rack);
    for (const sz of [0.5, -0.5]) {
      root.add(boneBetween(V3(1.28, 0.245, sz * 0.47), V3(1.36, 0.30, sz * 0.66), 0.012, 0.012, alu));
    }
    // 四轮悬架：斜置减振器 + 弹簧环 + 双控制臂
    for (const [wx, front] of [[AXLE_F, true], [AXLE_R, false]]) {
      for (const sz of [1, -1]) {
        root.add(boneBetween(V3(wx + 0.16, 0.58, sz * 0.46), V3(wx + 0.02, 0.37, sz * 0.62), 0.02, 0.024, alu));
        for (let i = 0; i < 3; i++) {
          const ring = mesh(new THREE.TorusGeometry(0.048, 0.009, 6, 14), M.paint(0xc23b2e),
            wx + 0.10 - i * 0.024, 0.43 + i * 0.036, sz * 0.545);
          ring.userData.noEdges = true;
          root.add(ring);
        }
        root.add(boneBetween(V3(wx - 0.18, 0.22, sz * 0.30), V3(wx, 0.30, sz * 0.60), 0.016, 0.016, alu));
        root.add(boneBetween(V3(wx + 0.22, 0.22, sz * 0.30), V3(wx + 0.04, 0.30, sz * 0.60), 0.016, 0.016, alu));
      }
    }
    // 后半轴 + CV 防尘套（后驱：动力由 PDK 直接传至后轮）
    for (const sz of [1, -1]) {
      const shaft = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 10), M.chrome(0xb9c1ca), AXLE_R, 0.357, sz * 0.38);
      shaft.rotation.x = Math.PI / 2;
      root.add(shaft);
      root.add(mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.09, 10), dark, AXLE_R, 0.357, sz * 0.16));
    }
    addEdges(root, 42);
    P(root, { name: '底盘与悬架', en: 'Chassis & Suspension', role: 'structure',
      desc: '992 前麦弗逊/后多连杆悬架，前桥加宽 42mm 显著提升转向响应；前后副车架经液压衬套与车身连接过滤振动。后桥半轴由 PDK 差速器直接驱动，选装后轮转向低速反向打、高速同向转。' },
      [0, -0.75, 0]);
  }

  /* ================= 17. 3.0T 水平对置六缸发动机（后置） ================= */
  {
    const root = new THREE.Group();
    const cast = M.castAlu(0x9aa5b1);
    const cast2 = M.castAlu(0x8a95a2);
    const dark = M.plastic(0x1b1f24, 0.6);
    const chrome = M.chrome(0xcdd4dc);
    // 曲轴箱（曲轴沿车身纵向）
    root.add(mesh(roundedBox(0.56, 0.18, 0.28, 0.045), cast, 0, -0.05, 0));
    // 左右气缸盖罩：水平对置 → 指向 ±Z
    for (const sz of [1, -1]) {
      root.add(mesh(roundedBox(0.50, 0.085, 0.22, 0.03), cast2, 0.02, 0.045, sz * 0.235));
      for (let i = 0; i < 5; i++) {
        root.add(mesh(new THREE.BoxGeometry(0.012, 0.095, 0.24), cast2, -0.17 + i * 0.095, 0.045, sz * 0.235));
      }
    }
    // 进气歧管脊
    root.add(mesh(roundedBox(0.34, 0.085, 0.19, 0.03), dark, -0.02, 0.135, 0));
    // 双涡轮增压器（布置在两排气缸夹角上方）
    for (const sz of [1, -1]) {
      const turbo = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.085, 16), chrome, 0.16, 0.125, sz * 0.10);
      turbo.rotation.z = Math.PI / 2;
      root.add(turbo);
      root.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 12), chrome, 0.16, 0.125, sz * 0.17));
    }
    // 油底壳
    root.add(mesh(roundedBox(0.42, 0.075, 0.24, 0.03), cast, 0, -0.155, 0));
    // 前端皮带轮 + 飞轮壳（连接 PDK）
    const pulley = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.028, 16), chrome, -0.315, -0.05, 0);
    pulley.rotation.z = Math.PI / 2;
    root.add(pulley);
    const bell = mesh(new THREE.CylinderGeometry(0.125, 0.09, 0.10, 16), cast, 0.335, -0.05, 0);
    bell.rotation.z = Math.PI / 2;
    root.add(bell);
    root.position.set(-1.60, 0.50, 0);
    addEdges(root, 40);
    P(root, { name: '水平对置六缸发动机', en: '3.0L Twin-Turbo Boxer-6', role: 'core',
      desc: '3.0T 双涡轮水平对置六缸（9A2B6）：活塞水平对向互搏抵消振动，引擎重心极低——这是 911 操控灵魂的物理来源。两颗涡轮布置在气缸夹角上方，385PS/450Nm，后置后驱把重量压在驱动桥上。' },
      [-0.6, 1.0, 0]);
  }

  /* ================= 18. 8 速 PDK 双离合变速箱 ================= */
  {
    const root = new THREE.Group();
    const cast = M.castAlu(0x8d98a5);
    const chrome = M.chrome(0xc8cfd7);
    root.add(mesh(roundedBox(0.34, 0.24, 0.27, 0.04), cast, 0, 0, 0));
    const clutch = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), chrome, 0.19, 0, 0);
    clutch.rotation.z = Math.PI / 2;
    root.add(clutch);
    for (let i = 0; i < 4; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.30, 0.012, 0.29), cast, 0, -0.06 + i * 0.045, 0));
    }
    const flange = mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 12), chrome, -0.20, 0, 0);
    flange.rotation.z = Math.PI / 2;
    root.add(flange);
    root.position.set(-1.16, 0.46, 0);
    addEdges(root, 40);
    P(root, { name: '8 速 PDK 变速箱', en: '8-Speed PDK (DCT)', role: 'internal',
      desc: '8 速 PDK 双离合变速箱位于引擎与后轴之间：奇偶挡分置两根输入轴，双离合器组交替接合实现毫秒级换挡不中断扭矩。8 个前进挡密齿比兼顾起步爆发与 293km/h 极速下的巡航转速。' },
      [-0.2, 0.75, 0.35]);
  }

  /* ================= 19. 排气系统（双边共两出圆形排气） ================= */
  {
    const root = new THREE.Group();
    const pipe = M.metal(0x8f959c, 0.4, 0.88);
    const chrome = M.chrome(0xd3d9e0);
    for (const sz of [1, -1]) {
      root.add(tube([V3(-1.52, 0.42, sz * 0.10), V3(-1.72, 0.35, sz * 0.14), V3(-1.88, 0.31, sz * 0.16)], 0.024, pipe, 16));
      const muffler = mesh(new THREE.CapsuleGeometry(0.085, 0.28, 6, 14), pipe, -2.02, 0.30, sz * 0.16);
      muffler.rotation.z = Math.PI / 2;
      root.add(muffler);
      root.add(tube([V3(-2.12, 0.30, sz * 0.16), V3(-2.20, 0.30, sz * 0.34)], 0.022, pipe, 8));
      const tip = mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.11, 16), chrome, -2.245, 0.30, sz * 0.34);
      tip.rotation.z = Math.PI / 2;
      root.add(tip);
      const rim = mesh(new THREE.TorusGeometry(0.046, 0.007, 6, 18), chrome, -2.295, 0.30, sz * 0.34);
      rim.rotation.y = Math.PI / 2;
      rim.userData.noEdges = true;
      root.add(rim);
    }
    addEdges(root, 42);
    P(root, { name: '排气系统', en: 'Exhaust System', role: 'internal',
      desc: '双侧各一路消音器，尾端双边共两出圆形排气是 Carrera 的标准配置。运动排气阀门开启时废气旁通消音腔直排，发出水平对置六缸特有的高频啸叫；三元催化器满足欧 6d 排放。' },
      [-0.8, -0.4, 0.5]);
  }

  /* ================= 20. 座舱：五联圆仪表 + GT 方向盘 + 中控屏 + PDK 排挡 ================= */
  {
    const root = new THREE.Group();
    const dark = M.plastic(0x20242a, 0.62);
    const dark2 = M.plastic(0x15181d, 0.5);
    const chrome = M.chrome(0xcdd4dc);
    root.add(mesh(roundedBox(0.36, 0.20, 1.32, 0.05), dark, 0.52, 0.90, 0));
    // 五联圆形仪表（中央转速表更大 —— 911 传统）
    root.add(mesh(roundedBox(0.05, 0.17, 0.38, 0.015), dark2, 0.385, 1.00, 0.35));
    refs.gaugeMat = M.emis(0x9fd0ff, 0.55, { color: 0x0c1420 });
    const layout = [[-0.135, 0.038], [-0.0675, 0.038], [0, 0.054], [0.0675, 0.038], [0.135, 0.038]];
    for (const [dz, r] of layout) {
      const g = mesh(new THREE.CylinderGeometry(r, r, 0.014, 18), refs.gaugeMat, 0.415, 1.00, 0.35 + dz);
      g.rotation.z = Math.PI / 2;
      g.userData.noEdges = true;
      root.add(g);
      const ring = mesh(new THREE.TorusGeometry(r, 0.0035, 6, 20), chrome, 0.424, 1.00, 0.35 + dz);
      ring.rotation.y = Math.PI / 2;
      ring.userData.noEdges = true;
      root.add(ring);
    }
    // GT 运动方向盘（可随前轮转向联动）
    const col = new THREE.Group();
    col.position.set(0.31, 0.935, 0.35);
    const tilt = new THREE.Group();
    tilt.rotation.z = 0.42;
    col.add(tilt);
    const sw = new THREE.Group();
    const rimG = new THREE.TorusGeometry(0.145, 0.019, 10, 26);
    rimG.rotateY(Math.PI / 2);
    sw.add(mesh(rimG, dark2));
    for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const sp = mesh(new THREE.BoxGeometry(0.02, 0.13, 0.045), dark2, 0, 0.062 * Math.cos(a), 0.062 * Math.sin(a));
      sp.rotation.x = a;
      sp.userData.noEdges = true;
      sw.add(sp);
    }
    sw.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), dark2, 0, 0, 0));
    sw.add(mesh(new THREE.BoxGeometry(0.012, 0.02, 0.03), M.emis(0xd8b545, 0.8, { color: 0x6a5a1a }), 0, 0.138, 0));
    tilt.add(sw);
    root.add(col);
    refs.steerWheel = sw;
    // 中控屏（向驾驶员倾斜）
    refs.screenMat = M.emis(0x3d7fd6, 0.55, { color: 0x0d1420 });
    const scr = mesh(new THREE.BoxGeometry(0.016, 0.15, 0.27), refs.screenMat, 0.695, 0.955, 0.06);
    scr.rotation.z = -0.10;
    root.add(scr);
    // 中控台 + PDK 排挡杆
    root.add(mesh(roundedBox(0.55, 0.15, 0.22, 0.03), dark, 0.02, 0.875, 0));
    root.add(mesh(new THREE.CylinderGeometry(0.013, 0.018, 0.055, 10), dark2, 0.14, 0.965, 0.0));
    root.add(mesh(new THREE.SphereGeometry(0.021, 12, 10), chrome, 0.14, 0.995, 0.0));
    root.add(mesh(new THREE.BoxGeometry(0.075, 0.006, 0.05), M.plastic(0x8c1f1f, 0.5), 0.14, 0.942, 0.0));
    addEdges(root, 42);
    P(root, { name: '五联仪表与座舱', en: '5-Dial Cockpit & Controls', role: 'internal',
      desc: '五联圆形仪表中央是传统机械转速表——911 数十年不变的传统，两侧液晶化显示。GT 运动方向盘直径 360mm 带驾驶模式旋钮，中控屏向驾驶员倾斜，PDK 换挡杆后是驾驶模式切换区。' },
      [0.7, 1.0, 0.3]);
  }

  /* ================= 21. 运动座椅 ×2 ================= */
  {
    const root = new THREE.Group();
    const cloth = M.plastic(0x23272e, 0.75);
    const cloth2 = M.plastic(0x2d323a, 0.75);
    for (const sz of [1, -1]) {
      root.add(mesh(roundedBox(0.46, 0.10, 0.40, 0.03), cloth, -0.08, 0.845, sz * 0.35));
      const back = mesh(roundedBox(0.12, 0.44, 0.40, 0.03), cloth2, -0.325, 1.01, sz * 0.35);
      back.rotation.z = 0.16;
      root.add(back);
      for (const dz of [0.165, -0.165]) {
        const bol = mesh(roundedBox(0.10, 0.30, 0.06, 0.02), cloth, -0.36, 1.01, sz * 0.35 + dz);
        bol.rotation.z = 0.16;
        bol.userData.noEdges = true;
        root.add(bol);
      }
      root.add(mesh(roundedBox(0.09, 0.13, 0.18, 0.025), cloth2, -0.40, 1.19, sz * 0.35));
    }
    addEdges(root, 42);
    P(root, { name: '运动座椅 ×2', en: 'Sport Seats', role: 'internal',
      desc: '8 向电动运动座椅：高侧翼在 1g 横向加速度下承托驾员躯干，座垫前缘加长支撑大腿。骨架为高强度钢 + 镁合金靠背减重，内置侧气囊、安全带张紧器与座椅占位传感。' },
      [0.1, 0.85, 0.4]);
  }

  /* ================= 22. 外后视镜 ×2 ================= */
  {
    const root = new THREE.Group();
    const paint = M.paint(PAINT);
    for (const sz of [1, -1]) {
      const arm = mesh(new THREE.BoxGeometry(0.05, 0.026, 0.13), paint, 0.47, 0.83, sz * 0.845);
      arm.rotation.x = sz * 0.30;
      root.add(arm);
      root.add(mesh(roundedBox(0.10, 0.075, 0.16, 0.03), paint, 0.44, 0.855, sz * 0.90));
      root.add(mesh(new THREE.BoxGeometry(0.012, 0.058, 0.135), M.plastic(0x1a2026, 0.25), 0.388, 0.855, sz * 0.90));
    }
    addEdges(root, 40);
    P(root, { name: '外后视镜', en: 'Side Mirrors', role: 'internal',
      desc: '镜壳经风洞优化把风噪压到最低，双曲率镜面消除外侧盲区。集成电动折叠与加热除雾，倒车时右侧镜片自动下翻照清后轮路缘，是 911 车宽之外最宽的突出件。' },
      [0.4, 0.5, 1.0]);
  }

  /* ================= 23. 外观细节套件（雨刷/侧腮/饰条/门缝/天线/油箱盖） ================= */
  {
    const root = new THREE.Group();
    const dark = M.plastic(0x14171b, 0.55);
    const chrome = M.chrome(0xcfd6de);
    // 无骨雨刷
    for (const sz of [1, -1]) {
      const w = mesh(new THREE.BoxGeometry(0.016, 0.007, 0.42), dark, 0.55, 0.815, sz * 0.28);
      w.rotation.y = -sz * 0.12;
      root.add(w);
    }
    // 后轮前方侧腮（911 侧进气口，为中冷器导流）
    for (const sz of [1, -1]) {
      const scoop = mesh(new THREE.BoxGeometry(0.22, 0.11, 0.05), dark, -0.53, 0.63, sz * 0.80);
      scoop.rotation.y = sz * 0.10;
      root.add(scoop);
      root.add(mesh(new THREE.BoxGeometry(0.18, 0.08, 0.02), M.plastic(0x0d0f12, 0.4), -0.53, 0.63, sz * 0.822));
    }
    // 侧窗亮黑饰条（分两段贴合上扬腰线）
    for (const sz of [1, -1]) {
      root.add(mesh(new THREE.BoxGeometry(1.05, 0.012, 0.014), chrome, 0.025, 0.80, sz * 0.805));
      const rear = mesh(new THREE.BoxGeometry(1.05, 0.012, 0.014), chrome, -1.02, 0.845, sz * 0.805);
      rear.rotation.z = 0.075;
      root.add(rear);
    }
    // 门缝
    for (const sz of [1, -1]) {
      root.add(mesh(new THREE.BoxGeometry(0.012, 0.42, 0.014), dark, 0.56, 0.56, sz * 0.812));
      root.add(mesh(new THREE.BoxGeometry(0.012, 0.42, 0.014), dark, -0.44, 0.56, sz * 0.812));
    }
    // 鲨鱼鳍天线
    const fin = mesh(new THREE.ConeGeometry(0.035, 0.07, 4), dark, -1.05, 1.18, 0);
    fin.scale.set(2.4, 1, 0.55);
    fin.rotation.y = Math.PI / 4;
    root.add(fin);
    // 油箱盖（右后翼子板）
    const fuelCap = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), M.brushed(0xb9c3cd), -1.62, 0.74, -0.812);
    fuelCap.rotation.x = Math.PI / 2;
    root.add(fuelCap);
    // 风挡下通风饰板
    root.add(mesh(new THREE.BoxGeometry(0.12, 0.012, 1.30), dark, 0.565, 0.808, 0));
    addEdges(root, 42);
    P(root, { name: '外观细节套件', en: 'Exterior Trim Kit', role: 'internal',
      desc: '后轮前方的侧腮是 911 的经典识别点：为发动机中冷器与后轮制动导流。无骨雨刷藏于风挡下缘降低风噪，亮黑饰条压低侧窗视觉重心，门缝、油箱盖与鳍式天线完成车身语义。' },
      [0, 0.35, 1.0]);
  }

  /* ================= 参数 ================= */
  const params = [
    { id: 'speed', label: '行驶速度', type: 'range', min: 0, max: 330, step: 5, value: 60, unit: ' km/h' },
    { id: 'steer', label: '前轮转向角', type: 'range', min: -35, max: 35, step: 1, value: 0, unit: '°' },
    { id: 'spoiler', label: '主动尾翼', type: 'range', min: 0, max: 100, step: 1, value: 0, unit: '%' },
    { id: 'doorOpen', label: '车门开度', type: 'range', min: 0, max: 100, step: 1, value: 0, unit: '%' }
  ];

  const state = { rotF: 0, rotR: 0 };

  function update(dt, t, p, ctx) {
    // 车轮滚动：km/h → rad/s（前后轮径不同，转速略有差异）
    const v = p.speed / 3.6;
    state.rotF -= v / R_F * dt;
    state.rotR -= v / R_R * dt;
    for (const w of refs.wheels) {
      w.userData.spin.rotation.z = w.userData.front ? state.rotF : state.rotR;
      if (w.userData.front) w.rotation.y = -p.steer * DEG;
    }
    // 方向盘联动（绕自身法线旋转）
    if (refs.steerWheel) refs.steerWheel.rotation.x = p.steer * DEG * 2.4;
    // 车门开合
    for (const d of refs.doors) {
      d.rotation.y = d.userData.side * (p.doorOpen / 100) * 1.15;
    }
    // 主动尾翼：0% 贴合尾甲板，100% 完全立起（铰链在前缘，后缘抬升）
    const sp = p.spoiler / 100;
    refs.wingPivot.rotation.z = 0.245 - sp * 0.78;
    refs.wingPivot.position.y = WING_PIVOT.y + sp * 0.05;
    // 夜间自动点亮车灯（992 日行灯常亮，夜间增强）
    const night = !!ctx?.night;
    refs.drlMat.emissiveIntensity = night ? 3.2 : 1.3;
    refs.headMat.emissiveIntensity = night ? 2.6 : 0.3;
    refs.tailMat.emissiveIntensity = night ? 2.2 : 0.55;
    refs.screenMat.emissiveIntensity = night ? 1.6 : 0.55;
    refs.gaugeMat.emissiveIntensity = night ? 1.5 : 0.55;
  }

  return {
    group, parts, params, update,
    hud: () => {
      const spd = params[0].value;
      const gears = [0, 18, 38, 62, 92, 128, 170, 225];
      let g = 1;
      for (const th of gears) if (spd > th) g++;
      g = Math.min(g, 8);
      const rpm = Math.round(spd / 3.6 / R_F / (Math.PI * 2) * 60);
      return `911 Carrera · ${spd} km/h · PDK ${g} 档 · 尾翼 ${params[2].value}% · 轮端 ${rpm} rpm`;
    }
  };
}
