// ============ 公共工具：材质工厂 / 部件注册 / 几何助手 ============
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** 材质工厂（每个部件独立实例，便于剖切/X光/高亮互不干扰） */
export const M = {
  /** 金属 */
  metal: (color = 0x9fb2c8, roughness = 0.35, metalness = 0.85, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...opts }),
  /** 塑料/橡胶 */
  plastic: (color = 0x2e343c, roughness = 0.6, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08, ...opts }),
  /** 玻璃 */
  glass: (color = 0xcfe6f5, opacity = 0.25) =>
    new THREE.MeshPhysicalMaterial({
      color, roughness: 0.06, metalness: 0, transparent: true,
      opacity, side: THREE.DoubleSide, envMapIntensity: 1.4
    }),
  /** 发光材质 */
  emis: (color, intensity = 1.2, opts = {}) =>
    new THREE.MeshStandardMaterial({
      color: 0x0c0e12, emissive: color, emissiveIntensity: intensity,
      roughness: 0.5, metalness: 0.2, ...opts
    }),

  /* ---- 专业质感预设 ---- */

  /** 车漆：清漆层 + 金属底色（汽车/家电外壳） */
  paint: (color = 0xb8352f, opts = {}) =>
    new THREE.MeshPhysicalMaterial({
      color, roughness: 0.34, metalness: 0.55,
      clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.15, ...opts
    }),
  /** 橡胶（轮胎/密封件/皮带） */
  rubber: (color = 0x16181c, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0, ...opts }),
  /** 镜面铬 */
  chrome: (color = 0xd9dfe7, opts = {}) => M.metal(color, 0.07, 1, opts),
  /** 拉丝铝（机加工表面，带细密划纹凹凸） */
  brushed: (color = 0xb9c3cd, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.33, metalness: 0.9, ...opts });
    m.bumpMap = noiseBump(9, 128, 700);
    m.bumpScale = 0.25;
    return m;
  },
  /** 铸造铝（发动机缸体/壳体，颗粒表面） */
  castAlu: (color = 0x96a1ad, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.82, ...opts });
    m.bumpMap = noiseBump(4, 128, 2800);
    m.bumpScale = 0.5;
    return m;
  },
  /** 碳纤维纹理（饰件/风罩） */
  carbon: (opts = {}) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0x1c2126, roughness: 0.32, metalness: 0.55,
      clearcoat: 0.9, clearcoatRoughness: 0.14, ...opts
    });
    m.bumpMap = weaveBump();
    m.bumpScale = 0.6;
    return m;
  }
};

/** 碳纤维斜纹凹凸贴图 */
function weaveBump(size = 128) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const cell = size / 8;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const g = 110 + (((i + j) % 2) ? 55 : 0);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(i * cell, j * cell, cell, cell);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      if ((i + j) % 2) ctx.fillRect(i * cell, j * cell, cell, cell / 2);
      else ctx.fillRect(i * cell, j * cell, cell / 2, cell);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

/** 圆角倒角盒（chamfered box，专业 CAD 观感的关键：倒角边能捕捉高光） */
export function roundedBox(w, h, d, r = 0.02, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

/** 部件角色样式 */
export const ROLE_STYLE = {
  shell:     { label: '外壳', color: '#f5a623' },
  structure: { label: '结构', color: '#38bdf8' },
  internal:  { label: '内部', color: '#a78bfa' },
  core:      { label: '核心', color: '#35d0a5' }
};

/** 在 group 中注册一个"部件根节点" */
export function part(group, object, info) {
  object.userData.isPartRoot = true;
  object.userData.info = { role: 'core', ...info };
  group.add(object);
  return object;
}

/** 快速创建网格 */
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 给所有网格添加 CAD 风格描边 */
export function addEdges(root, threshold = 30, color = 0x0d1622, opacity = 0.42) {
  root.traverse(o => {
    if (o.isMesh && !o.userData.noEdges) {
      const eg = new THREE.EdgesGeometry(o.geometry, threshold);
      const l = new THREE.LineSegments(eg,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
      l.name = '__edges';
      l.userData.noPick = true;
      l.raycast = () => {};
      o.add(l);
    }
  });
}

/** 两点之间生成骨骼/连杆圆柱 */
export function boneBetween(a, b, r1, r2, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r1, r1, len, 12), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  return m;
}

/** 沿点列生成软管/管道 */
export function tube(points, r, mat, seg = 28) {
  const curve = new THREE.CatmullRomCurve3(points);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10), mat);
  m.castShadow = true;
  return m;
}

/**
 * 沿曲线扫掠"变半径"管体 —— 长骨/肌肉/躯干等有机形体的核心工具。
 * radius: 数字（圆截面）或函数 t => 数字 / [rx, rz]（椭圆截面）
 * 采用平行标架（非 Frenet），竖直曲线用 X 轴作参考，避免截面翻转
 */
export function sweepTube(points, radius, opts = {}) {
  const { segments = 36, radial = 12, capStart = true, capEnd = true, mat } = opts;
  const pts = points.map(p => p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts);
  const pos = [], idx = [];
  const P0 = new THREE.Vector3(), T = new THREE.Vector3(),
    Nn = new THREE.Vector3(), Bb = new THREE.Vector3(), A = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, P0);
    curve.getTangent(t, T).normalize();
    A.set(0, 1, 0);
    if (Math.abs(T.y) > 0.85) A.set(1, 0, 0);
    Nn.crossVectors(T, A);
    if (Nn.lengthSq() < 1e-8) Nn.set(1, 0, 0);
    Nn.normalize();
    Bb.crossVectors(Nn, T).normalize();
    const r = typeof radius === 'function' ? radius(t) : radius;
    const rx = Array.isArray(r) ? r[0] : r;
    const rz = Array.isArray(r) ? r[1] : r;
    for (let j = 0; j < radial; j++) {
      const a = j / radial * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(
        P0.x + rx * ca * Nn.x + rz * sa * Bb.x,
        P0.y + rx * ca * Nn.y + rz * sa * Bb.y,
        P0.z + rx * ca * Nn.z + rz * sa * Bb.z
      );
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = i * radial + j, a2 = i * radial + j2;
      const b = (i + 1) * radial + j, b2 = (i + 1) * radial + j2;
      idx.push(a, b, a2, a2, b, b2);
    }
  }
  // 端面封口
  const cap = (t, flip) => {
    curve.getPoint(t, P0);
    const c = pos.length / 3;
    pos.push(P0.x, P0.y, P0.z);
    const ring = t < 0.5 ? 0 : segments;
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = ring * radial + j, a2 = ring * radial + j2;
      if (flip) idx.push(c, a, a2); else idx.push(c, a2, a);
    }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 带褶皱的球体（大脑沟回 / 小脑） */
export function wrinkledSphere(r, mat, freq = 20, amp = 0.05, opts = {}) {
  const geo = new THREE.SphereGeometry(r, 48, 36);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.copy(v).normalize();
    const d = Math.sin(n.x * freq) * Math.sin(n.y * freq * 1.35 + 1.7) * Math.sin(n.z * freq * 0.85 + 3.1);
    v.addScaledVector(n, d * amp * r + amp * r * 0.4);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/**
 * Metaball 隐式曲面烘焙（Marching Cubes）—— 雕刻级有机形体的核心。
 * balls: [x, y, z, r]（世界坐标 + 半径），多球融合成一张连续光滑闭合曲面
 */
export function bakeBlobs(balls, opts = {}) {
  const { res = 40, material, isolation = 80, subtract = 12 } = opts;
  if (!balls.length) return null;
  const box = new THREE.Box3();
  for (const b of balls) {
    const r = b[3];
    box.expandByPoint(new THREE.Vector3(b[0] - r, b[1] - r, b[2] - r));
    box.expandByPoint(new THREE.Vector3(b[0] + r, b[1] + r, b[2] + r));
  }
  box.expandByScalar(0.02);
  const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
  const center = box.getCenter(new THREE.Vector3());
  const cx = center.x, cy = center.y, cz = center.z;

  const mc = new MarchingCubes(res, material, false, false, 300000);
  mc.isolation = isolation;
  mc.reset();
  for (const [x, y, z, r] of balls) {
    const nx = (x - cx) / size + 0.5;
    const ny = (y - cy) / size + 0.5;
    const nz = (z - cz) / size + 0.5;
    const nr = r / size;
    if (nx < -0.2 || nx > 1.2 || ny < -0.2 || ny > 1.2 || nz < -0.2 || nz > 1.2) continue;
    mc.addBall(nx, ny, nz, isolation + subtract ? (isolation + subtract) * nr * nr : 92 * nr * nr, subtract);
  }
  mc.update();

  const src = mc.geometry;
  const count = src.drawRange.count;
  if (!count) return null;
  const posAttr = src.getAttribute('position');
  const normAttr = src.getAttribute('normal');
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // MarchingCubes 顶点位于 [-1,1] 立方体空间
    pos[i * 3] = posAttr.getX(i) * size / 2 + cx;
    pos[i * 3 + 1] = posAttr.getY(i) * size / 2 + cy;
    pos[i * 3 + 2] = posAttr.getZ(i) * size / 2 + cz;
    nor[i * 3] = normAttr.getX(i);
    nor[i * 3 + 1] = normAttr.getY(i);
    nor[i * 3 + 2] = normAttr.getZ(i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 超椭圆截面点集（u=横向, v=纵向；eTop/eBottom 控制上下方正圆度） */
export function superellipsePts(rx, ry, N = 24, eTop = 2, eBottom = 2, vOffset = 0) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const th = i / N * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const e = s >= 0 ? eTop : eBottom;
    pts.push([
      Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * rx,
      Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * ry + vOffset
    ]);
  }
  return pts;
}

/** NACA 四位数翼型点集（弦长 1，返回闭环 [[u,v]]） */
export function airfoilPts(N = 16, thickness = 0.12, camber = 0.03) {
  const yt = x => 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const yc = x => 4 * camber * x * (1 - x);   // 抛物弯度线，首尾归零
  const pts = [];
  for (let i = N; i >= 0; i--) {   // 上表面 TE→LE
    const xc = (1 - Math.cos(Math.PI * i / N)) / 2;
    pts.push([1 - xc, yc(xc) + yt(xc)]);
  }
  for (let i = 1; i < N; i++) {    // 下表面 LE→TE
    const xc = (1 - Math.cos(Math.PI * i / N)) / 2;
    pts.push([1 - xc, yc(xc) - yt(xc)]);
  }
  return pts;
}

/**
 * 截面放样（Loft）—— CAD 曲面造型核心。
 * stations: [{ pos:[x,y,z], side:[..](默认+X), up:[..](默认+Y), pts:[[u,v]...] }]
 * u 沿 side 轴、v 沿 up 轴，各站 pts 数量必须一致
 */
export function loftSections(stations, opts = {}) {
  const { material, closedLoop = true, capStart = true, capEnd = true } = opts;
  const n = stations[0].pts.length;
  const pos = [], idx = [];
  const side = new THREE.Vector3(), up = new THREE.Vector3(), P = new THREE.Vector3();
  stations.forEach(st => {
    side.fromArray(st.side ?? [1, 0, 0]);
    up.fromArray(st.up ?? [0, 1, 0]);
    P.fromArray(st.pos);
    for (const [u, v] of st.pts) {
      pos.push(P.x + side.x * u + up.x * v, P.y + side.y * u + up.y * v, P.z + side.z * u + up.z * v);
    }
  });
  for (let s = 0; s < stations.length - 1; s++) {
    const jMax = closedLoop ? n : n - 1;   // 开放放样时不回绕到最后一点（越界会产生 NaN 顶点）
    for (let j = 0; j < jMax; j++) {
      const j2 = (j + 1) % n;
      const a = s * n + j, a2 = s * n + j2, b = (s + 1) * n + j, b2 = (s + 1) * n + j2;
      idx.push(a, a2, b, a2, b2, b);
    }
  }
  const cap = (si, flip) => {
    const st = stations[si];
    P.fromArray(st.pos);
    let c = 0;
    for (const [u, v] of st.pts) { c += u; }
    const cu = c / n;
    let cv = 0;
    for (const [u, v] of st.pts) { cv += v; }
    cv /= n;
    const ci = pos.length / 3;
    pos.push(P.x + (st.side ? st.side[0] : 1) * cu + (st.up ? st.up[0] : 0) * cv,
      P.y + (st.side ? st.side[1] : 0) * cu + (st.up ? st.up[1] : 1) * cv,
      P.z + (st.side ? st.side[2] : 0) * cu + (st.up ? st.up[2] : 0) * cv);
    const jMax = closedLoop ? n : n - 1;
    for (let j = 0; j < jMax; j++) {
      const j2 = (j + 1) % n;
      const a = si * n + j, a2 = si * n + j2;
      if (flip) idx.push(ci, a, a2); else idx.push(ci, a2, a);
    }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(stations.length - 1, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 程序化噪声凹凸贴图（皮肤毛孔/骨质/织物质感） */
export function noiseBump(repeat = 6, size = 128, density = 2600) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < density; i++) {
    const g = 96 + Math.floor(Math.random() * 64);
    ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
    const r = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/** 圆角矩形 Shape（手机/笔记本外壳用） */
export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

/** 释放模型资源 */
export function disposeGroup(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}
