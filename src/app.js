// ============ 主应用：UI 装配 / 模式控制 / 参数面板 / 拾取高亮 ============
import * as THREE from 'three';
import { Viewer } from './viewer.js';
import { ModeManager } from './modes.js';
import { MODELS, registerModel } from './models/registry.js';
import { ROLE_STYLE } from './lib.js';
import { ATLAS_SYSTEMS } from './models/humanAtlas.js';

const MODES = [
  { id: 'model', name: '建模', key: '1', desc: '实体建模视图：PBR 材质 + CAD 边线，可旋转缩放观察整体造型',
    icon: '<path d="M12 3l7.5 4.3v8.4L12 20l-7.5-4.3V7.3z"/><path d="M12 3v8.5M4.5 7.3l7.5 4.2 7.5-4.2M12 20v-8.4"/>' },
  { id: 'xray', name: '剖析', key: '2', desc: 'X 光剖析模式：外壳半透明，露出内部结构与核心部件',
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M11 8v8M15 8v8M18.5 8v8" stroke-dasharray="2 2"/>' },
  { id: 'disassemble', name: '拆解', key: '3', desc: '分步拆解：拖动进度条按装配层级逐层拆开，可播放拆解动画',
    icon: '<path d="M9 3v5M15 3v5M6 8h12v4H6z"/><path d="M9 12v3l-3 3M15 12v3l3 3M12 12v9"/>' },
  { id: 'assemble', name: '组合', key: '4', desc: '装配动画：从散件状态按序装配成型，展示组装关系',
    icon: '<path d="M9 21v-5M15 21v-5M6 16h12v-4H6z"/><path d="M9 12V9l-3-3M15 12V9l3-3M12 12V3"/>' },
  { id: 'exploded', name: '爆炸视图', key: '5', desc: '爆炸拆解：所有部件径向炸开，附引导线与部件标注',
    icon: '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4V3M14.2 10.9l5.3-4.4M15 12h6M14.2 13.1l5.3 4.4M12 14.6V21M9.8 13.1l-5.3 4.4M9 12H3M9.8 10.9L4.5 6.5"/>' },
  { id: 'view45', name: '45° 展示', key: '6', desc: '标准 45° 展示机位：方位角 45°、仰角 28° 的经典产品视角',
    icon: '<path d="M12 4L4 8.5v7L12 20l8-4.5v-7z"/><path d="M12 12L4 8.5M12 12l8-3.5M12 12v8"/><path d="M17 5l3 1.7-2 1.8"/>' },
  { id: 'section', name: '剖切', key: '7', desc: '剖面剖切：沿 X/Y/Z 轴剖开模型，可拖动剖面位置观察内部',
    icon: '<path d="M12 3l7.5 4.3-7.5 4.2-7.5-4.2z" fill="rgba(77,163,255,.25)"/><path d="M4.5 7.3v6L12 17.5l7.5-4.2v-6" stroke-dasharray="3 2"/><path d="M12 11.5V20M7 14h10"/>' }
];

const DISPLAY_OPTS = [
  { id: 'edges', label: '边线', value: true },
  { id: 'wireframe', label: '线框', value: false },
  { id: 'grid', label: '网格', value: true },
  { id: 'rotate', label: '旋转', value: false }
];

class App {
  constructor() {
    this.viewer = new Viewer(
      document.getElementById('canvasHost'),
      document.getElementById('canvasHost')
    );
    this.modes = new ModeManager(this.viewer);
    this.night = false;
    this.modelId = null;
    this.model = null;
    this.params = {};
    this.selected = null;
    this.selBox = null;
    this.displayOpts = { ...Object.fromEntries(DISPLAY_OPTS.map(o => [o.id, o.value])) };
    this._syncedExplode = -1;

    this._buildTopTabs();
    this._buildModeBar();
    this._buildDisplayOptions();
    this._bindEvents();

    window.DTW = {
      registerModel: (def) => {
        const id = registerModel(def);
        this._buildTopTabs();
        return id;
      },
      loadModel: (id) => this.loadModel(id),
      list: () => MODELS.map(m => m.id)
    };
    window.__app = this;
    window.addEventListener('dtw:model-registered', () => this._buildTopTabs());

    this.viewer.setDayNight(false);
    this.loadModel(MODELS[0].id);
    this._last = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  /* ---------- UI 构建 ---------- */
  _buildTopTabs() {
    const nav = document.getElementById('modelTabs');
    nav.innerHTML = '';
    for (const m of MODELS) {
      const b = document.createElement('button');
      b.className = 'm-tab' + (m.id === this.modelId ? ' active' : '');
      b.dataset.id = m.id;
      b.innerHTML = `${m.icon}<span>${m.name}</span><small>${m.sub}</small>`;
      b.title = m.desc;
      b.onclick = () => this.loadModel(m.id);
      nav.appendChild(b);
    }
  }

  _buildModeBar() {
    const bar = document.getElementById('modeBar');
    bar.innerHTML = '';
    for (const m of MODES) {
      const b = document.createElement('button');
      b.className = 'mode-btn';
      b.dataset.id = m.id;
      b.innerHTML = `<span class="k">${m.key}</span>${m.icon ? `<svg viewBox="0 0 24 24">${m.icon}</svg>` : ''}<span>${m.name}</span>`;
      b.onclick = () => this.setMode(m.id);
      bar.appendChild(b);
    }
  }

  _buildDisplayOptions() {
    const box = document.getElementById('displayOptions');
    box.innerHTML = '';
    for (const o of DISPLAY_OPTS) {
      const c = document.createElement('div');
      c.className = 'opt-chip' + (this.displayOpts[o.id] ? ' on' : '');
      c.textContent = o.label;
      c.onclick = () => {
        this.displayOpts[o.id] = !this.displayOpts[o.id];
        c.classList.toggle('on', this.displayOpts[o.id]);
        this._applyDisplayOptions();
      };
      box.appendChild(c);
    }
  }

  _applyDisplayOptions() {
    const o = this.displayOpts;
    if (this.model) {
      this.model.group.traverse(x => { if (x.name === '__edges') x.visible = o.edges; });
      const mats = this.viewer.modelMats;
      for (const m of mats) if (m.userData._side === undefined) m.wireframe = o.wireframe;
    }
    this.viewer.gridDay.visible = !this.night && o.grid;
    this.viewer.gridNight.visible = this.night && o.grid;
    this.viewer.controls.autoRotate = o.rotate;
  }

  _bindEvents() {
    document.getElementById('btnDayNight').onclick = () => this.toggleNight();
    document.getElementById('btnReset').onclick = () => { this.deselect(); this.viewer.fitView(); };

    // 拾取（区分点击与拖拽）
    const cv = this.viewer.renderer.domElement;
    let downPos = null;
    cv.addEventListener('pointerdown', e => { downPos = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', e => {
      if (!downPos) return;
      const dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
      downPos = null;
      if (dx * dx + dy * dy > 36) return;
      const hit = this.viewer.pickAt(e.clientX, e.clientY);
      if (hit) this.selectHit(hit);
      else this.deselect();
    });
    cv.addEventListener('pointermove', e => {
      // 悬停只做包围盒近似拾取（合并网格的精确拾取留给点击）
      const hit = this.viewer.pickAt(e.clientX, e.clientY, { approximate: true });
      cv.style.cursor = hit ? 'pointer' : 'grab';
      this._updateHoverTip(e, hit);
    });

    // 悬停名称提示（Atlas 爆炸布局下的部件识别）
    this.hoverTip = document.createElement('div');
    this.hoverTip.className = 'hover-tip';
    document.body.appendChild(this.hoverTip);

    // 信息卡
    document.getElementById('infoClose').onclick = () => this.deselect();
    document.getElementById('infoFocus').onclick = () => {
      if (!this.selected) return;
      let c, r;
      if (this.selectedStructure) {
        // 结构级选择：用记录的包围盒（含爆炸位移）计算
        const b = this.selectedStructure.bounds.clone().applyMatrix4(this.selectedStructure.mesh.matrixWorld);
        c = b.getCenter(new THREE.Vector3());
        r = b.getSize(new THREE.Vector3()).length() / 2;
      } else {
        c = this.viewer.worldCenter(this.selected);
        r = this._partRadius(this.selected);
      }
      const dist = Math.max(r * 5, this.viewer.worldCenter(this.model.group).distanceTo(c) * 0.8, 0.4);
      this.viewer.tweenCam(
        c.clone().add(new THREE.Vector3(0.7, 0.45, 0.9).normalize().multiplyScalar(dist + 0.6)),
        c, 0.7
      );
    };
    // 隔离：只显示选中部件所属系统
    document.getElementById('infoIsolate').onclick = () => {
      if (!this.selected || !this.model.atlas) return;
      const sys = this.selectedStructure
        ? this.selectedStructure.info.system
        : this.selected.userData.info.system;
      for (const [key, root] of Object.entries(this.model.systemRoots)) {
        const on = key === sys;
        root.visible = on;
        const param = this.model.params.find(p => p.id === `sys_${key}`);
        if (param) { param.value = on; this.params[param.id] = on; }
      }
      this._renderParams();
      this.toast(`已隔离显示「${ATLAS_SYSTEMS[sys]?.zh || sys}」 · 再点参数面板可恢复`);
    };

    // 部件搜索
    document.getElementById('partSearch').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      if (this.model?.atlas) { this._renderPartList(); return; }
      for (const li of document.querySelectorAll('#partList li')) {
        li.style.display = !q || li.dataset.key.includes(q) ? '' : 'none';
      }
    });

    // 快捷键
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const mode = MODES.find(m => m.key === e.key);
      if (mode) this.setMode(mode.id);
      else if (e.key === 'n' || e.key === 'N') this.toggleNight();
      else if (e.key === 'r' || e.key === 'R') { this.deselect(); this.viewer.fitView(); }
      else if (e.key === 'Escape') this.deselect();
    });
  }

  toggleNight() {
    this.night = !this.night;
    this.viewer.setDayNight(this.night);
    document.getElementById('dnIcon').textContent = this.night ? '☀️' : '🌙';
    document.getElementById('dnText').textContent = this.night ? '日间' : '夜间';
    this._applyDisplayOptions();
    this.toast(this.night ? '已切换至夜间模式' : '已切换至日间模式');
  }

  /* ---------- 模型加载 ---------- */
  loadModel(id) {
    const def = MODELS.find(m => m.id === id);
    if (!def || this._loading) return Promise.resolve();
    this._loading = true;
    const loading = document.getElementById('loading');
    loading.classList.remove('off');
    document.getElementById('loadingText').textContent = `正在构建「${def.name}」…`;

    const onProgress = (text) => {
      if (typeof text === 'string') document.getElementById('loadingText').textContent = text;
    };

    return Promise.resolve()
      .then(() => new Promise(r => setTimeout(r, 40)))
      .then(async () => {
        this.deselect();
        this.modelId = id;
        this.model = await def.build(onProgress);
        this.params = Object.fromEntries(this.model.params.map(p => [p.id, p.value]));
        this.viewer.setModel(this.model);
        this.viewer.fitView();
        this.modes.setModel(this.model);
        this.setMode('model', true);
        this._buildTopTabs();
        this._renderPartList();
        this._renderParams();
        this._renderModeControls();
        this._applyDisplayOptions();
        this._updateStatus();
        this._loading = false;
        loading.classList.add('off');
        const count = this.model.displayCount ?? this.model.parts.length;
        this.toast(`已加载「${def.name}」 · ${count} 个部件`);
      })
      .catch(err => {
        this._loading = false;
        loading.classList.add('off');
        console.error(err);
        this.toast(`「${def.name}」加载失败：${err.message || err}`);
      });
  }

  _renderPartList() {
    const ul = document.getElementById('partList');
    ul.innerHTML = '';
    document.getElementById('partCount').textContent =
      this.model.displayCount ?? this.model.parts.length;
    const search = (document.getElementById('partSearch').value || '').trim().toLowerCase();

    // 大型数据集（BodyParts3D）：按系统分组折叠 + 搜索（遍历结构记录，而非网格）
    if (this.model.atlas) {
      const groups = new Map();
      for (const s of this.model.structures) {
        if (!groups.has(s.system)) groups.set(s.system, []);
        groups.get(s.system).push(s);
      }
      // 按系统定义顺序排列分组，未知系统殿后
      const order = [...Object.keys(ATLAS_SYSTEMS), ...groups.keys()];
      const seen = new Set();
      let matchTotal = 0;
      for (const sys of order) {
        if (seen.has(sys) || !groups.has(sys)) continue;
        seen.add(sys);
        const list = groups.get(sys);
        const def = ATLAS_SYSTEMS[sys] || { zh: sys, color: '#888' };
        const color = '#' + (def.color ? def.color.toString(16).padStart(6, '0') : '888888');
        const matched = search
          ? list.filter(s => (s.name + (s.nameEn || '')).toLowerCase().includes(search))
          : list;
        if (search && !matched.length) continue;
        matchTotal += matched.length;

        const head = document.createElement('li');
        head.className = 'sys-head';
        head.innerHTML = `<span class="sys-dot" style="background:${color}"></span>${def.zh}<small>${matched.length}</small><span class="sys-arrow">▾</span>`;
        const wrap = document.createElement('ul');
        wrap.className = 'sys-items';
        if (search) head.classList.add('open'); else wrap.style.display = 'none';
        head.onclick = () => {
          head.classList.toggle('open');
          wrap.style.display = head.classList.contains('open') ? '' : 'none';
        };
        ul.appendChild(head);
        for (const s of matched.slice(0, 400)) {
          const li = document.createElement('li');
          li.className = 'sub';
          li.dataset.key = (s.name + (s.nameEn || '')).toLowerCase();
          li.dataset.sid = s.sid;
          li.innerHTML = `<span class="dot" style="background:${color}"></span>${s.name}`;
          li.onclick = () => {
            this.selectStructure(s);
            const b = s.bounds;
            const c = b.getCenter(new THREE.Vector3()).applyMatrix4(s.mesh.matrixWorld);
            const r = b.getSize(new THREE.Vector3()).length() / 2;
            this.viewer.tweenCam(
              c.clone().add(new THREE.Vector3(0.75, 0.5, 0.95).normalize().multiplyScalar(r * 5 + 0.3)),
              c, 0.7
            );
          };
          wrap.appendChild(li);
        }
        if (matched.length > 400) {
          const more = document.createElement('li');
          more.className = 'sub more';
          more.textContent = `… 其余 ${matched.length - 400} 项请用搜索定位`;
          wrap.appendChild(more);
        }
        ul.appendChild(wrap);
      }
      if (search) {
        const tip = document.createElement('li');
        tip.className = 'search-tip';
        tip.textContent = `搜索到 ${matchTotal} 个结构`;
        ul.prepend(tip);
      }
      return;
    }

    // 常规模型：平铺列表
    this.model.parts.forEach(p => {
      const info = p.root.userData.info;
      const li = document.createElement('li');
      li.dataset.key = (info.name + info.en).toLowerCase();
      li.innerHTML = `<span class="dot" style="background:${ROLE_STYLE[info.role]?.color || '#888'}"></span>${info.name}<small>${ROLE_STYLE[info.role]?.label || ''}</small>`;
      li.onclick = () => {
        this.selectPart(p.root);
        const c = this.viewer.worldCenter(p.root);
        this.viewer.tweenCam(
          c.clone().add(new THREE.Vector3(0.75, 0.5, 0.95).normalize().multiplyScalar(this._partRadius(p.root) * 5 + 0.3)),
          c, 0.7
        );
      };
      li.dataset.rootId = p.root.id;
      ul.appendChild(li);
    });
  }

  _partRadius(root) {
    return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).length() / 2;
  }

  _renderParams() {
    const box = document.getElementById('modelParams');
    box.innerHTML = '';
    for (const def of this.model.params) {
      if (def.type === 'range') {
        const row = document.createElement('div');
        row.className = 'p-row';
        row.innerHTML = `<div class="p-label"><b>${def.label}</b><span class="val">${def.value}${def.unit || ''}</span></div>`;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = def.min; input.max = def.max; input.step = def.step; input.value = def.value;
        const val = row.querySelector('.val');
        const sync = () => {
          val.textContent = def.value + (def.unit || '');
          input.style.setProperty('--fill', `${(def.value - def.min) / (def.max - def.min) * 100}%`);
        };
        input.oninput = () => { def.value = +input.value; this.params[def.id] = def.value; sync(); };
        sync();
        row.appendChild(input);
        box.appendChild(row);
      } else if (def.type === 'toggle') {
        const row = document.createElement('div');
        row.className = 'switch-row';
        row.innerHTML = `<span>${def.label}</span><label class="switch"><input type="checkbox" ${def.value ? 'checked' : ''}><span class="track"></span></label>`;
        row.querySelector('input').onchange = e => {
          def.value = e.target.checked;
          this.params[def.id] = def.value;
        };
        box.appendChild(row);
      } else if (def.type === 'select') {
        const row = document.createElement('div');
        row.className = 'p-row';
        row.innerHTML = `<div class="p-label"><b>${def.label}</b></div>`;
        const sel = document.createElement('select');
        sel.className = 'p-select';
        for (const o of def.options) {
          const op = document.createElement('option');
          op.value = o.v; op.textContent = o.label;
          sel.appendChild(op);
        }
        sel.value = def.value;
        sel.onchange = () => { def.value = sel.value; this.params[def.id] = def.value; };
        row.appendChild(sel);
        box.appendChild(row);
      }
    }
  }

  /* ---------- 模式 ---------- */
  setMode(id, silent = false) {
    this.modes.setMode(id);
    // Atlas 爆炸布局：切换到拆解/爆炸/组合时对齐网格取景
    if (this.model?.atlas && ['exploded', 'disassemble', 'assemble'].includes(id)) {
      const box = this.modes.getGridWorldBox();
      if (box) this.viewer.fitBox(box);
    }
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    this._renderModeControls();
    this._updateStatus();
    if (!silent) {
      const def = MODES.find(m => m.id === id);
      this.toast(def ? def.desc : '');
    }
  }

  _renderModeControls() {
    const box = document.getElementById('modeControls');
    box.innerHTML = '';
    const mode = this.modes.mode;
    this._explodeSlider = null;
    this._assembleSlider = null;

    const hint = (text) => {
      const d = document.createElement('div');
      d.className = 'hint-text';
      d.innerHTML = text;
      box.appendChild(d);
    };
    const slider = (label, min, max, step, value, onInput, unit = '') => {
      const row = document.createElement('div');
      row.className = 'p-row';
      row.innerHTML = `<div class="p-label"><b>${label}</b><span class="val">${Math.round(value)}${unit}</span></div>`;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min; input.max = max; input.step = step; input.value = value;
      const val = row.querySelector('.val');
      input.oninput = () => {
        val.textContent = Math.round(+input.value) + unit;
        input.style.setProperty('--fill', `${(+input.value - min) / (max - min) * 100}%`);
        onInput(+input.value);
      };
      input.style.setProperty('--fill', `${(value - min) / (max - min) * 100}%`);
      row.appendChild(input);
      box.appendChild(row);
      return { input, val };
    };
    const toggle = (label, value, onChange) => {
      const row = document.createElement('div');
      row.className = 'switch-row';
      row.innerHTML = `<span>${label}</span><label class="switch"><input type="checkbox" ${value ? 'checked' : ''}><span class="track"></span></label>`;
      row.querySelector('input').onchange = e => onChange(e.target.checked);
      box.appendChild(row);
    };
    const button = (label, primary, onClick) => {
      const b = document.createElement('button');
      b.className = 'act-btn' + (primary ? ' primary' : '');
      b.textContent = label;
      b.onclick = onClick;
      return b;
    };
    const btnRow = (...btns) => {
      const d = document.createElement('div');
      d.className = 'btn-row';
      btns.forEach(b => d.appendChild(b));
      box.appendChild(d);
    };

    switch (mode) {
      case 'model':
        hint('自由查看模式：拖动旋转 · 滚轮缩放 · 右键平移。<br>点击模型或左侧列表可查看部件详情。');
        break;
      case 'xray': {
        hint('外壳已呈半透明状态，可透视内部结构。');
        slider('外壳透明度', 5, 70, 1, this.modes.xrayOpacity * 100, v => {
          this.modes.setXray(true, v / 100);
        }, '%');
        break;
      }
      case 'disassemble': {
        const s = slider('拆解进度', 0, 100, 1, this.modes.explode * 100, v => {
          this.modes.stopPlay();
          this.modes.setExplode(v / 100);
        }, '%');
        this._explodeSlider = s;
        btnRow(
          button('▶ 播放拆解', true, () => { this.modes.play('disassemble'); }),
          button('复位', false, () => { this.modes.stopPlay(); this.modes.setExplode(0); })
        );
        if (!this.model.atlas) {
          toggle('部件标注', this.modes.showLabels, v => { this.modes.showLabels = v; this.modes.applyExplode(); });
        }
        break;
      }
      case 'assemble': {
        const s = slider('装配进度', 0, 100, 1, (1 - this.modes.explode) * 100, v => {
          this.modes.stopPlay();
          this.modes.setExplode(1 - v / 100);
        }, '%');
        this._assembleSlider = s;
        btnRow(
          button('▶ 重新装配', true, () => { this.modes.play('assemble'); }),
          button('拆散', false, () => { this.modes.stopPlay(); this.modes.setExplode(1); })
        );
        break;
      }
      case 'exploded': {
        const s = slider('爆炸幅度', 0, 100, 1, this.modes.explode * 100, v => {
          this.modes.setExplode(v / 100);
        }, '%');
        this._explodeSlider = s;
        if (!this.model.atlas) {
          toggle('部件标注', this.modes.showLabels, v => { this.modes.showLabels = v; this.modes.applyExplode(); });
          toggle('引导线', this.modes.showLines, v => { this.modes.showLines = v; this.modes.applyExplode(); });
        } else {
          hint('悬停部件显示名称，点击查看介绍。<br>拖动"爆炸幅度"可回到装配状态。');
        }
        break;
      }
      case 'view45':
        hint('已切换至 45° 标准展示机位。<br>开启右上角"旋转"可自动转台展示。');
        break;
      case 'section': {
        const cfg = this.modes.sectionCfg;
        const seg = document.createElement('div');
        seg.className = 'seg';
        for (const ax of ['x', 'y', 'z']) {
          const b = document.createElement('button');
          b.textContent = ax.toUpperCase();
          b.className = cfg.axis === ax ? 'on' : '';
          b.onclick = () => { cfg.axis = ax; this.viewer.setSection(cfg); this._renderModeControls(); };
          seg.appendChild(b);
        }
        box.appendChild(seg);
        slider('剖面位置', -100, 100, 1, cfg.pos * 100, v => {
          cfg.pos = v / 100;
          this.viewer.setSection(cfg);
        }, '%');
        btnRow(
          button('翻转方向', false, () => { cfg.flip = !cfg.flip; this.viewer.setSection(cfg); }),
          button(cfg.show ? '隐藏切面' : '显示切面', false, () => {
            cfg.show = !cfg.show;
            this.viewer.setSection(cfg);
            this._renderModeControls();
          })
        );
        hint('拖动"剖面位置"可动态剖切模型，XYZ 切换轴向。');
        break;
      }
    }
  }

  /* ---------- 部件选择 ---------- */
  /** 拾取结果分发：Atlas 数据集选中具体结构，常规模型选中部件根 */
  selectHit(hit) {
    if (hit.structure) this.selectStructure(hit.structure);
    else this.selectPart(hit.root);
  }

  /** Atlas 结构级选择：合并网格上以包围盒高亮，不做材质替换 */
  selectStructure(s) {
    this.deselect(true);
    this.selected = s.mesh;
    this.selectedStructure = s;
    const worldBox = s.bounds.clone().applyMatrix4(s.mesh.matrixWorld);
    this.selBox = new THREE.Box3Helper(worldBox, 0xffb547);
    this.selBox.material.transparent = true;
    this.selBox.material.opacity = 0.9;
    this.viewer.scene.add(this.selBox);

    document.querySelectorAll('#partList li.sel').forEach(li => li.classList.remove('sel'));
    document.querySelectorAll(`#partList li[data-sid="${s.sid}"]`).forEach(li => li.classList.add('sel'));

    const info = s.info;
    const chip = document.getElementById('infoRole');
    const sysDef = ATLAS_SYSTEMS[info.system];
    const chipColor = sysDef ? '#' + sysDef.color.toString(16).padStart(6, '0') : '#888888';
    chip.textContent = sysDef?.zh || info.system;
    chip.style.background = chipColor + '22';
    chip.style.color = chipColor;
    chip.style.border = `1px solid ${chipColor}55`;
    document.getElementById('infoName').textContent = info.name;
    document.getElementById('infoEn').textContent = info.en || '';
    document.getElementById('infoDesc').textContent = info.desc || '暂无描述。';
    document.getElementById('infoSource').style.display = '';
    document.getElementById('infoCard').classList.remove('hidden');
  }

  selectPart(root) {
    this.deselect(true);
    this.selected = root;
    const info = root.userData.info;

    // 高亮：共享材质（Atlas 数据集）用换材质方案，普通材质直接调 emissive
    root.traverse(o => {
      if (o.isMesh) {
        const m = o.material;
        if (m.userData?.isShared) {
          o.userData._origMat = m;
          const hl = m.clone();
          hl.userData.isShared = false;
          hl.emissive = new THREE.Color(0x2f7fe0);
          hl.emissiveIntensity = 0.5;
          o.material = hl;
        } else if (m.emissive) {
          m.userData._origEmis = m.userData._origEmis ||
            { color: m.emissive.getHex(), intensity: m.emissiveIntensity };
          m.emissive.setHex(0x2f7fe0);
          m.emissiveIntensity = 0.55;
        }
      }
    });
    this.selBox = new THREE.BoxHelper(root, 0xffb547);
    this.selBox.material.transparent = true;
    this.selBox.material.opacity = 0.9;
    this.viewer.scene.add(this.selBox);

    // 列表高亮
    document.querySelectorAll('#partList li').forEach(li =>
      li.classList.toggle('sel', li.dataset.rootId == root.id));

    // 信息卡
    const role = ROLE_STYLE[info.role] || { label: info.role, color: '#888' };
    const chip = document.getElementById('infoRole');
    chip.textContent = info.system ? (ATLAS_SYSTEMS[info.system]?.zh || role.label) : role.label;
    const chipColor = info.system && ATLAS_SYSTEMS[info.system]
      ? '#' + ATLAS_SYSTEMS[info.system].color.toString(16).padStart(6, '0') : role.color;
    chip.style.background = chipColor + '22';
    chip.style.color = chipColor;
    chip.style.border = `1px solid ${chipColor}55`;
    document.getElementById('infoName').textContent = info.name;
    document.getElementById('infoEn').textContent = info.en || '';
    document.getElementById('infoDesc').textContent = info.desc || '暂无描述。';
    document.getElementById('infoSource').style.display = 'none';
    document.getElementById('infoCard').classList.remove('hidden');
  }

  deselect(keepCard = false) {
    if (this.selected) {
      this.selected.traverse(o => {
        if (o.isMesh) {
          if (o.userData._origMat) {
            o.material = o.userData._origMat;
            delete o.userData._origMat;
          } else if (o.material.emissive && o.material.userData._origEmis) {
            const orig = o.material.userData._origEmis;
            o.material.emissive.setHex(orig.color);
            o.material.emissiveIntensity = orig.intensity;
          }
        }
      });
    }
    this.selected = null;
    this.selectedStructure = null;
    if (this.selBox) { this.viewer.scene.remove(this.selBox); this.selBox = null; }
    document.querySelectorAll('#partList li.sel').forEach(li => li.classList.remove('sel'));
    if (!keepCard) document.getElementById('infoCard').classList.add('hidden');
  }

  /* ---------- 状态栏 / Toast ---------- */
  _updateHoverTip(e, hit) {
    const tip = this.hoverTip;
    const show = hit && this.model?.atlas &&
      ['exploded', 'disassemble', 'assemble'].includes(this.modes.mode);
    if (!show) { tip.style.display = 'none'; return; }
    const sys = hit.info?.system;
    const def = ATLAS_SYSTEMS[sys];
    const color = def ? '#' + def.color.toString(16).padStart(6, '0') : '#8aa';
    const count = def ? this.model.structures.filter(s => s.system === sys).length : 0;
    tip.innerHTML = `<span class="dot" style="background:${color}"></span>` +
      `${def?.zh || hit.info?.name || ''}` + (count ? `<small>${count} 个结构</small>` : '');
    tip.style.display = 'flex';
    const x = Math.min(e.clientX + 16, window.innerWidth - tip.offsetWidth - 10);
    const y = Math.min(e.clientY + 18, window.innerHeight - tip.offsetHeight - 10);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  _updateStatus() {
    const def = MODELS.find(m => m.id === this.modelId);
    const modeDef = MODES.find(m => m.id === this.modes.mode);
    const count = this.model ? (this.model.displayCount ?? this.model.parts.length) : 0;
    document.getElementById('statusLeft').textContent =
      `${def?.name || ''} · ${count} 部件 · ${modeDef?.name || ''}`;
  }

  toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- 主循环 ---------- */
  _loop(now) {
    requestAnimationFrame(t => this._loop(t));
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const t = now / 1000;

    if (this.model) {
      this.model.update(dt, t, this.params, { night: this.night, viewer: this.viewer });
    }
    this.modes.update(dt);

    // 同步拆解/装配进度条
    const e = this.modes.explode;
    if (Math.abs(e - this._syncedExplode) > 0.002) {
      this._syncedExplode = e;
      if (this._explodeSlider) {
        this._explodeSlider.input.value = e * 100;
        this._explodeSlider.val.textContent = Math.round(e * 100) + '%';
        this._explodeSlider.input.style.setProperty('--fill', `${e * 100}%`);
      }
      if (this._assembleSlider) {
        this._assembleSlider.input.value = (1 - e) * 100;
        this._assembleSlider.val.textContent = Math.round((1 - e) * 100) + '%';
        this._assembleSlider.input.style.setProperty('--fill', `${(1 - e) * 100}%`);
      }
    }

    // 选中框跟随
    // BoxHelper（常规模型）需手动 update；Box3Helper（Atlas 结构）随包围盒自动跟随
    if (this.selBox && this.selected) this.selBox.update?.();
    if (this.selectedStructure && this.selBox) {
      this.selBox.box.copy(this.selectedStructure.bounds)
        .applyMatrix4(this.selectedStructure.mesh.matrixWorld);
    }

    // HUD
    if (this.model?.hud) {
      document.getElementById('statusHud').textContent = this.model.hud();
    }

    this.viewer.render(dt);
  }
}

new App();
