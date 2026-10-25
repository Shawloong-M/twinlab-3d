// ============ 笔记本电脑模型（屏幕开合 · 内部硬件 · 风扇散热动画） ============
import * as THREE from 'three';
import { M, part, mesh, addEdges, roundedBox, roundedRectShape } from '../lib.js';

function drawDesktop(brightness) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 320;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 320);
  grad.addColorStop(0, '#0f2027'); grad.addColorStop(0.5, '#203a43'); grad.addColorStop(1, '#2c5364');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 320);
  // 山脉剪影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 260);
  for (let x = 0; x <= 512; x += 64) ctx.lineTo(x, 220 - Math.sin(x / 80) * 40);
  ctx.lineTo(512, 320); ctx.lineTo(0, 320);
  ctx.fill();
  // 窗口
  ctx.fillStyle = 'rgba(28,34,44,0.92)';
  roundRect(ctx, 96, 60, 320, 190, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,70,84,0.9)';
  roundRect(ctx, 96, 60, 320, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#ff5f57'; ctx.beginPath(); ctx.arc(110, 72, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#febc2e'; ctx.beginPath(); ctx.arc(126, 72, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#28c840'; ctx.beginPath(); ctx.arc(142, 72, 4.5, 0, 7); ctx.fill();
  // 代码行
  const codeColors = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#8b949e'];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = codeColors[i % 5];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(110, 96 + i * 20, 60 + ((i * 53) % 180), 8);
  }
  ctx.globalAlpha = 1;
  // 菜单栏与 Dock
  ctx.fillStyle = 'rgba(10,12,16,0.85)';
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '9px sans-serif';
  ctx.fillText('TwinOS', 12, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 156, 286, 200, 30, 8);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `hsl(${i * 40}, 60%, 60%)`;
    roundRect(ctx, 164 + i * 27, 291, 20, 20, 5);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function buildLaptop() {
  const group = new THREE.Group();
  const parts = [];
  const refs = { fans: [] };
  const BW = 1.34, BD = 0.94;

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };
  const matShell = (c = 0x9aa4ae) => M.metal(c, 0.4, 0.85);
  const matPCB = () => M.plastic(0x1e5a3a, 0.6);

  /* ---- D 面（底壳） ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(BW, BD, 0.06), { depth: 0.016, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);   // 平放为水平薄板
    root.add(mesh(geo, matShell(0x8a949e), 0, 0.008, 0));
    // 底部脚垫与散热开孔
    for (const [x, z] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) {
      root.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 10), M.plastic(0x1a1d22, 0.7), x, 0.006, z));
    }
    addEdges(root, 35);
    P(root, { name: 'D 面底壳', en: 'Bottom Case', role: 'shell',
      desc: '镁铝合金底壳：开孔率 30% 的进风格栅配合防尘网，脚垫抬高 3mm 形成进气负压风道。' },
      [0, -0.75, 0]);
  }

  /* ---- 中框骨架（连接 C/D 面的三明治结构 + 侧壁 I/O） ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(BW - 0.015, BD - 0.015, 0.05), { depth: 0.052, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    root.add(mesh(geo, matShell(0x6e7781), 0, 0.024, 0));
    // 左侧：双 USB-C + 耳机孔；右侧：电源键 + 双 USB-A + HDMI + SD 卡槽
    const portM = M.plastic(0x0b0d10, 0.7);
    root.add(mesh(new THREE.BoxGeometry(0.026, 0.018, 0.09), portM, -BW / 2 - 0.001, 0.050, -0.28));
    root.add(mesh(new THREE.BoxGeometry(0.026, 0.018, 0.09), portM, -BW / 2 - 0.001, 0.050, -0.14));
    root.add(mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.04, 12), portM, -BW / 2 - 0.002, 0.050, 0.02));
    root.add(mesh(roundedBox(0.016, 0.075, 0.05, 0.02), M.metal(0x8a949e, 0.4, 0.85), BW / 2 + 0.002, 0.050, 0.36));
    root.add(mesh(new THREE.BoxGeometry(0.036, 0.014, 0.12), portM, BW / 2 + 0.001, 0.050, -0.30));
    root.add(mesh(new THREE.BoxGeometry(0.036, 0.014, 0.12), portM, BW / 2 + 0.001, 0.050, -0.12));
    root.add(mesh(new THREE.BoxGeometry(0.030, 0.016, 0.14), portM, BW / 2 + 0.001, 0.050, 0.06));
    root.add(mesh(new THREE.BoxGeometry(0.012, 0.020, 0.30), portM, BW / 2 + 0.001, 0.050, 0.26));
    addEdges(root, 40);
    P(root, { name: '中框骨架与接口', en: 'Chassis Frame & I/O', role: 'structure',
      desc: '镁铝合金中间骨架把 C/D 两面锁合成封闭受力盒，抗扭转刚度由此而来。侧壁 I/O 主板直出不过桥接：左侧双 USB-C 4.0（40Gbps PD 供电），右侧双 USB-A 10Gbps + HDMI 2.1 + UHS-II SD 卡槽。' },
      [0, -0.35, 0]);
  }

  /* ---- 主板 ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(1.0, 0.018, 0.72), matPCB(), 0, 0.046, -0.03));
    root.add(mesh(new THREE.BoxGeometry(0.92, 0.008, 0.64), M.metal(0x2a3138, 0.4, 0.8), 0, 0.060, -0.03));
    addEdges(root, 45);
    P(root, { name: '主板', en: 'Logic Board', role: 'internal',
      desc: '高密度堆叠主板：SiP 封装集成 CPU/GPU/内存控制器，十层 HDI 板走线宽度仅 0.075mm。' },
      [0.1, 0.85, 0]);
  }

  /* ---- CPU 与散热模组 ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.09, 0.012, 0.09), M.metal(0x2a2f38, 0.35, 0.85), 0, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), M.metal(0xc9973f, 0.35, 1), 0, 0.016, 0)); // 铜盖
    // 热管
    for (const dz of [0.03, -0.03]) {
      const pipe = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 10), M.metal(0xc97b3d, 0.35, 1), 0.1, 0.03, dz);
      pipe.rotation.z = Math.PI / 2;
      pipe.userData.noEdges = true;
      root.add(pipe);
    }
    // 鳍片组
    for (let i = 0; i < 12; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.012, 0.05, 0.2), M.metal(0xb8c2cc, 0.4, 0.9), 0.42, 0.035, -0.1 + i * 0.021));
    }
    addEdges(root, 45);
    P(root, { name: 'CPU 与散热模组', en: 'CPU & Cooling', role: 'core',
      desc: '双风扇双热管散热：均热板把 45W 功耗的热量快速导出，相变硅脂界面导热系数 8 W/(m·K)。' },
      [0.25, 1.2, 0]);
    refs.cpu = root;
  }

  /* ---- 风扇 ×2 ---- */
  for (const x of [0.12, 0.52]) {
    const root = new THREE.Group();
    const house = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.045, 22), M.plastic(0x22262c, 0.55));
    house.userData.noEdges = true;
    root.add(house);
    const rotor = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const blade = mesh(new THREE.BoxGeometry(0.1, 0.006, 0.05), M.plastic(0x394048, 0.5),
        0.075 * Math.cos(a), 0, 0.075 * Math.sin(a));
      blade.rotation.y = -a + 0.5;
      blade.userData.noEdges = true;
      rotor.add(blade);
    }
    rotor.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), M.plastic(0x14181d, 0.5)));
    root.add(rotor);
    root.position.set(x, 0.046, -0.28);
    root.userData.rotor = rotor;
    addEdges(root, 50);
    P(root, { name: x < 0.3 ? '左风扇' : '右风扇', en: 'Cooling Fan', role: 'core',
      desc: '0.1mm 液态轴承超薄风扇：最高 6500rpm，风量 12CFM，满载噪音控制在 38dB 以内。' },
      [x * 1.6, 1.05, -0.35]);
    refs.fans.push(root);
  }

  /* ---- 内存 ×2 ---- */
  for (const x of [-0.28, -0.13]) {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.05, 0.012, 0.3), matPCB(), 0, 0, 0));
    for (let i = 0; i < 6; i++) {
      root.add(mesh(new THREE.BoxGeometry(0.045, 0.006, 0.03), M.plastic(0x14181d, 0.5), 0, 0.009, -0.11 + i * 0.045));
    }
    root.position.set(x, 0.048, 0.18);
    addEdges(root, 45);
    P(root, { name: '内存条', en: 'SO-DIMM Memory', role: 'internal',
      desc: 'DDR5-5600 16GB 内存：双通道 64bit 总线，带宽 89.6GB/s，金手指镀金防氧化。' },
      [x * 2.2, 0.95, 0.35]);
  }

  /* ---- SSD ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.26, 0.012, 0.09), matPCB(), 0, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(0.1, 0.008, 0.075), M.plastic(0x14181d, 0.5), 0.05, 0.01, 0));
    root.position.set(-0.35, 0.048, -0.25);
    addEdges(root, 45);
    P(root, { name: 'NVMe 固态硬盘', en: 'SSD', role: 'internal',
      desc: 'PCIe 4.0 x4 NVMe SSD：顺序读取 7000MB/s，主控 8 通道 NAND 并行，1GB 文件拷贝仅需 0.2 秒。' },
      [-0.3, 1.0, -0.4]);
  }

  /* ---- 电池 ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.72, 0.05, 0.6), M.plastic(0x2e3a4a, 0.55), 0, 0, 0));
    root.add(mesh(new THREE.BoxGeometry(0.5, 0.005, 0.35), M.plastic(0xc9d4de, 0.5), 0, 0.028, 0));
    root.position.set(0.05, 0.045, 0.14);
    addEdges(root, 45);
    P(root, { name: '锂电池组', en: 'Battery Pack', role: 'internal',
      desc: '76Wh 四电芯锂电池组： lithium聚合物电芯，支持 100W USB-PD 快充，30 分钟充至 50%。' },
      [0.05, 0.7, 0.55]);
  }

  /* ---- 扬声器 ×2 ---- */
  for (const x of [-0.52, 0.52]) {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(0.24, 0.02, 0.09), M.plastic(0x14181d, 0.55), 0, 0, 0));
    root.position.set(x, 0.045, -0.36);
    addEdges(root, 50);
    P(root, { name: '扬声器', en: 'Speaker', role: 'internal',
      desc: '四扬声器系统：低音单元振幅 2x，支持空间音频，杜比全景声认证。' },
      [x * 2.0, 0.75, -0.5]);
  }

  /* ---- C 面（键盘面） ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(BW, BD, 0.05), { depth: 0.014, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    root.add(mesh(geo, matShell(), 0, 0.076, 0));
    addEdges(root, 35);
    P(root, { name: 'C 面掌托', en: 'Top Case', role: 'shell',
      desc: 'CNC 一体成型铝合金 C 面：阳极氧化表层莫氏硬度 9，掌托边缘经钻石切割亮边工艺处理。' },
      [0, 0.55, 0]);
    refs.cdeck = root;
  }

  /* ---- 键盘 ---- */
  {
    const root = new THREE.Group();
    const keyGeo = new THREE.BoxGeometry(0.068, 0.016, 0.068);
    const keyMat = M.plastic(0x24282e, 0.65);
    const rows = 5, cols = 14;
    const inst = new THREE.InstancedMesh(keyGeo, keyMat, rows * cols);
    inst.castShadow = true;
    inst.userData.noEdges = true;
    const m = new THREE.Matrix4();
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        m.setPosition(-0.55 + c * 0.078, 0.098, -0.28 + r * 0.083);
        inst.setMatrixAt(idx++, m);
      }
    }
    root.add(inst);
    // 空格键
    root.add(mesh(new THREE.BoxGeometry(0.4, 0.016, 0.068), keyMat, 0.05, 0.098, -0.28 + 4 * 0.083));
    // 键盘区右上角电源键（带指示灯点）
    root.add(mesh(new THREE.BoxGeometry(0.068, 0.016, 0.068), keyMat, 0.55, 0.098, -0.28));
    root.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 12), M.emis(0x7fd4a2, 0.6, { color: 0x102018 }), 0.55, 0.107, -0.28));
    addEdges(root, 40);
    P(root, { name: '键盘', en: 'Backlit Keyboard', role: 'core',
      desc: '1.5mm 键程剪刀脚键盘：单键 RGB 背光，键帽 PBT 材质抗打油，X 型支架薄膜防水泼溅。' },
      [0, 0.95, -0.2]);
  }

  /* ---- 触控板 ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(0.52, 0.34, 0.04), { depth: 0.004, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    root.add(mesh(geo, M.metal(0xb6c0ca, 0.35, 0.9), 0, 0.006, 0));
    root.position.set(0, 0.092, 0.27);
    addEdges(root, 35);
    P(root, { name: '触控板', en: 'Force Touch Trackpad', role: 'core',
      desc: '玻璃触控板：压感传感器全域可按，Taptic Engine 模拟段落点击手感，支持多指手势。' },
      [0, 0.8, 0.35]);
  }

  /* ---- 屏幕总成（A 壳 + B 面显示） ---- */
  const screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  screenMat.map = drawDesktop();
  screenMat.needsUpdate = true;
  const lid = new THREE.Group();
  {
    const root = lid;
    const geoA = new THREE.ExtrudeGeometry(roundedRectShape(BW, 0.88, 0.06), { depth: 0.026, bevelEnabled: false });
    const cover = mesh(geoA, matShell(), 0, 0.44, -0.013);
    root.add(cover);
    const bezel = mesh(new THREE.BoxGeometry(BW - 0.04, 0.84, 0.008), M.plastic(0x0c0e12, 0.5), 0, 0.44, 0.004);
    root.add(bezel);
    const panel = mesh(new THREE.PlaneGeometry(BW - 0.12, 0.74), screenMat, 0, 0.44, 0.012);
    panel.userData.noEdges = true;
    root.add(panel);
    root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), M.plastic(0x0c0e12, 0.4), 0, 0.83, 0.014)); // 摄像头
    root.position.set(0, 0.088, -BD / 2 + 0.02);
    addEdges(root, 35);
    P(root, { name: '屏幕总成', en: 'Display Assembly', role: 'core',
      desc: '14 英寸 3K OLED 触控屏：120Hz 刷新率，100% DCI-P3 色域出厂校色 ΔE<1，峰值亮度 600 尼特。' },
      [0, 0.4, -1.2]);
    refs.lid = root;
    refs.screenMat = screenMat;
  }

  /* ---- 转轴 ---- */
  {
    const root = new THREE.Group();
    for (const x of [-0.45, 0.45]) {
      root.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 12), M.metal(0x5a6068, 0.4, 0.85), x, 0.080, 0));
    }
    root.add(mesh(new THREE.BoxGeometry(1.0, 0.05, 0.06), M.metal(0x5a6068, 0.4, 0.85), 0, 0.072, 0));
    root.position.set(0, 0.02, -BD / 2 + 0.02);
    addEdges(root, 40);
    P(root, { name: '转轴', en: 'Hinges', role: 'core',
      desc: '360° 阻尼转轴：3 万次开合寿命测试，任意角度悬停，单手可开合且屏幕不晃动。' },
      [0, -0.1, -0.7]);
  }

  /* ---- 参数 ---- */
  const params = [
    { id: 'lidAngle', label: '屏幕开合角', type: 'range', min: 0, max: 130, step: 1, value: 100, unit: '°' },
    { id: 'fanSpeed', label: '风扇转速', type: 'range', min: 0, max: 100, step: 1, value: 25, unit: ' %' }
  ];

  const state = { lidCur: 100, fanRot: 0 };

  function update(dt, t, p) {
    // 屏幕开合（缓动跟随目标值）
    const diff = p.lidAngle - state.lidCur;
    if (Math.abs(diff) > 0.01) state.lidCur += diff * Math.min(1, dt * 6);
    const rad = Math.PI / 2 - state.lidCur * Math.PI / 180;
    refs.lid.rotation.x = rad;
    // 风扇
    state.fanRot += Math.min(2 + p.fanSpeed / 100 * 45, 47) * dt;
    refs.fans.forEach(f => { f.userData.rotor.rotation.y = state.fanRot; });
  }

  return {
    group, parts, params, update,
    hud: () => `屏幕 ${Math.round(state.lidCur)}° · 风扇 ${params[1].value}% · ${params[1].value > 60 ? '性能模式' : '安静模式'}`
  };
}
