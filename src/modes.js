// ============ 展示模式管理：建模 / 剖析 / 拆解 / 组合 / 爆炸 / 45° / 剖切 ============
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = v => Math.min(1, Math.max(0, v));

export class ModeManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.model = null;
    this.parts = [];
    this.mode = 'model';
    this.explode = 0;          // 0=组装完成 1=完全炸开
    this.xrayOpacity = 0.22;
    this.showLabels = true;
    this.showLines = true;
    this.sectionCfg = { axis: 'x', pos: 0, flip: false, show: true };
    this.playing = false;
    this.playDir = 1;
    this.playDur = 2.8;
    this._xrayMats = [];
    this._xraySeen = new Set();
    this._lastExplodeRendered = -1;
  }

  /** 模型载入后：计算每个部件的爆开方向、装配次序、标签与引导线 */
  setModel(model) {
    this.model = model;
    this.mode = 'model';
    this.explode = 0;
    this.playing = false;
    this._xrayMats = [];

    const g = model.group;
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const centerW = box.getCenter(new THREE.Vector3());
    const centerL = g.worldToLocal(centerW.clone());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.5);
    this.center = centerW;
    this.radius = radius;

    this.parts = model.parts.map(p => {
      const root = p.root;
      const bb = new THREE.Box3().setFromObject(root);
      const cL = g.worldToLocal(bb.getCenter(new THREE.Vector3()).clone());
      const info = root.userData.info;
      const labelLocal = cL.clone().sub(root.position);

      let offset;
      if (p.explode) {
        offset = new THREE.Vector3(...p.explode).multiplyScalar(radius / 2.1);
      } else {
        const d = cL.clone().sub(centerL);
        const dist = d.length() || 0.001;
        d.normalize().multiplyScalar((0.3 + Math.min(dist / radius, 1.2)) * radius * 0.62);
        offset = d;
      }

      // 标签（部件数 ≤400 时生成名称标签；Atlas 的 15 个系统也标出）
      let label = null;
      if (model.parts.length <= 400) {
        const el = document.createElement('div');
        el.className = 'p-tag';
        el.textContent = info.name;
        label = new CSS2DObject(el);
        label.position.copy(labelLocal);
        label.visible = false;
        root.add(label);
      }

      const distN = Math.min(bb.getCenter(new THREE.Vector3()).distanceTo(centerW) / radius, 1);
      return {
        info, root, offset, label,
        home: root.position.clone(),
        labelLocal,
        center0: cL.clone(),
        bbSize: bb.getSize(new THREE.Vector3()),
        bbCenterL: cL.clone(),
        delayE: (1 - distN) * 0.42,   // 爆炸：外层先走
        delayA: distN * 0.42,         // 装配：内层先装
        eased: 0
      };
    });

    // Atlas（人体解剖等合并网格数据集）：爆炸时按"从大到小、从上到下"整齐排布成网格，
    // 而非径向炸开——对齐解剖图谱的分系统展示习惯
    this.gridBox = null;
    if (model.atlas) this._layoutAtlasGrid(g, centerL, radius);

    // 引导线（组装位 → 爆开位）——大型数据集跳过
    if (model.atlas || model.parts.length > 400) {
      this.lines = new THREE.LineSegments(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ visible: false }));
      this.lines.visible = false;
      g.add(this.lines);
    } else {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.parts.length * 6), 3));
      this.lines = new THREE.LineSegments(lg,
        new THREE.LineBasicMaterial({ color: 0x7fa0c8, transparent: true, opacity: 0.5 }));
      this.lines.visible = false;
      this.lines.frustumCulled = false;
      g.add(this.lines);
    }

    this.applyExplode();
  }

  /** Atlas 数据集爆炸布局：目录式排布 —— 每个系统缩放到统一展示尺寸，杜绝"一个大系统撑爆全网格" */
  _layoutAtlasGrid(g, centerL, radius) {
    const n = this.parts.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const sorted = [...this.parts].sort((a, b) =>
      Math.max(b.bbSize.x, b.bbSize.y, b.bbSize.z) - Math.max(a.bbSize.x, a.bbSize.y, a.bbSize.z));
    const gap = 0.3 * radius;
    const target = radius * 0.5;          // 每个系统的统一展示尺寸（最大边）
    const cellW = target + gap, cellH = target + gap;
    const gridW = cols * cellW, gridH = rows * cellH;
    const gridBaseY = 0.18;   // 网格底边离地高度

    sorted.forEach((p, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const rowShift = (cols - inRow) / 2;             // 末行不足时居中
      const cx = (col + rowShift + 0.5) * cellW - gridW / 2;
      const cy = gridBaseY + gridH - (row + 0.5) * cellH;   // 大件在上、小件在下，整体不沉入地面
      const cell = new THREE.Vector3(centerL.x + cx, cy, 0);
      p.offset.copy(cell).sub(p.bbCenterL);            // home + offset → 包围盒中心对齐单元格
      const maxDim = Math.max(p.bbSize.x, p.bbSize.y, p.bbSize.z) || 0.01;
      p.fitScale = Math.min(2.4, Math.max(0.12, target / maxDim));  // 爆炸时缩放到展示尺寸
    });

    this.gridBox = new THREE.Box3(
      new THREE.Vector3(centerL.x - gridW / 2, gridBaseY, -radius * 0.6),
      new THREE.Vector3(centerL.x + gridW / 2, gridBaseY + gridH, radius * 0.6)
    );
  }

  /** 网格布局的世界坐标包围盒（供相机取景） */
  getGridWorldBox() {
    if (!this.gridBox) return null;
    const g = this.model.group;
    return new THREE.Box3().setFromPoints([
      g.localToWorld(this.gridBox.min.clone()),
      g.localToWorld(this.gridBox.max.clone())
    ]);
  }

  /** 按当前 explode 值更新所有部件位置 / 引导线 / 标签 */
  applyExplode() {
    const f = this.explode;
    if (f !== this._lastExplodeRendered) {
      this._lastExplodeRendered = f;
      this.viewer.markShadowDirty?.();   // 部件移动后阴影贴图需重绘
    }
    const asm = this.mode === 'assemble';
    const hasLines = this.lines && this.lines.geometry.attributes.position;

    if (hasLines) {
      var arr = this.lines.geometry.attributes.position.array;
    }
    this.parts.forEach((p, i) => {
      const delay = asm ? p.delayA : p.delayE;
      const t = easeInOut(clamp01((f - delay) / Math.max(1e-6, 1 - delay)));
      p.eased = t;
      p.root.position.copy(p.home).addScaledVector(p.offset, t);
      if (p.fitScale) p.root.scale.setScalar(1 + (p.fitScale - 1) * t);   // Atlas 目录式缩放，组装位恢复原尺寸
      if (hasLines) {
        const base = p.center0;
        arr[i * 6] = base.x; arr[i * 6 + 1] = base.y; arr[i * 6 + 2] = base.z;
        arr[i * 6 + 3] = base.x + p.offset.x * t;
        arr[i * 6 + 4] = base.y + p.offset.y * t;
        arr[i * 6 + 5] = base.z + p.offset.z * t;
      }
    });
    if (hasLines) this.lines.geometry.attributes.position.needsUpdate = true;

    // Atlas 系统网格在爆炸时自发光增强（向本色靠拢），白天/夜间都更易辨认
    if (this.model.atlas) {
      const boost = Math.min(1, f * 1.4);
      for (const p of this.parts) {
        p.root.traverse(o => {
          if (o.isMesh && o.material && o.material.emissive) {
            if (!o.userData._em0) o.userData._em0 = o.material.emissive.clone();
            o.material.emissive.copy(o.userData._em0).lerp(o.material.color, boost * 0.45);
          }
        });
      }
    }

    const linesOn = this.showLines && f > 0.03 && hasLines &&
      (this.mode === 'exploded' || this.mode === 'disassemble' || this.mode === 'assemble');
    this.lines.visible = linesOn;
    if (linesOn) this.lines.material.opacity = Math.min(0.55, f * 0.8);

    const labelsOn = this.showLabels && f > 0.3 &&
      (this.mode === 'exploded' || this.mode === 'disassemble');
    for (const p of this.parts) { if (p.label) p.label.visible = labelsOn; }
  }

  setExplode(f) {
    this.explode = Math.min(1, Math.max(0, f));
    this.applyExplode();
  }

  play(kind) {
    this.playDir = kind === 'assemble' ? -1 : 1;
    if (kind === 'assemble' && this.explode < 0.02) this.explode = 1;
    if (kind === 'disassemble' && this.explode > 0.98) this.explode = 0;
    this.playing = true;
  }

  stopPlay() { this.playing = false; }

  setMode(mode) {
    const prev = this.mode;
    if (prev === 'section' && mode !== 'section') this.viewer.setSection(null);
    if (prev === 'xray' && mode !== 'xray') this.setXray(false);
    this.playing = false;

    this.mode = mode;
    switch (mode) {
      case 'model':
        this.viewer.setSection(null);
        break;
      case 'xray':
        this.setXray(true);
        break;
      case 'disassemble':
        break;
      case 'assemble':
        this.setExplode(1);
        this.play('assemble');
        break;
      case 'exploded':
        this.setExplode(1);
        break;
      case 'view45':
        this.setExplode(0);
        this.viewer.view45();
        break;
      case 'section':
        this.setExplode(0);
        this.viewer.setSection(this.sectionCfg);
        break;
    }
    this.applyExplode();
  }

  /** X 光透视：外壳半透明；部件可通过 info.xray 指定专属透明度（分层透视） */
  setXray(on, opacity = this.xrayOpacity) {
    this.xrayOpacity = opacity;
    for (const rec of this._xrayMats) {
      rec.m.transparent = rec.transparent;
      rec.m.opacity = rec.opacity;
      rec.m.depthWrite = rec.depthWrite;
    }
    this._xrayMats = [];
    this._xraySeen = new Set();
    if (!on || !this.model) return;

    for (const p of this.model.parts) {
      const info = p.root.userData.info;
      const isShell = info.role === 'shell';
      const custom = info.xray;
      if (!isShell && custom === undefined) continue;
      const op = custom !== undefined ? custom : opacity;
      p.root.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (this._xraySeen.has(m)) return;   // 共享材质只记录一次，避免恢复成已改状态
          this._xraySeen.add(m);
          this._xrayMats.push({
            m,
            transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite
          });
          m.transparent = true;
          m.opacity = Math.min(m.opacity, op);
          m.depthWrite = false;
        });
      });
    }
  }

  update(dt) {
    if (this.playing) {
      this.explode += this.playDir * dt / this.playDur;
      if (this.explode <= 0 || this.explode >= 1) {
        this.explode = Math.min(1, Math.max(0, this.explode));
        this.playing = false;
      }
      this.applyExplode();
    }
  }
}
