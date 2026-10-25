// ============ 3D 视口：场景 / 灯光 / 昼夜 / 相机 / 拾取 / 剖切 ============
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const DAY = {
  bg: 0xdde5ee, fog: 0xdde5ee,
  hemiSky: 0xdfeaf5, hemiGnd: 0x8a97a8, hemi: 0.85,
  sun: 3.2, sunColor: 0xfff1dd,
  fill: 0.7, env: 0.95,
  grid1: 0x8fa3b8, grid2: 0xc2cfdb, gridOp: 0.5,
  ground: 0xe6ecf2, shadow: 0.3
};
const NIGHT = {
  bg: 0x0a0f1a, fog: 0x0a0f1a,
  hemiSky: 0x2c3e5f, hemiGnd: 0x0c1220, hemi: 0.3,
  sun: 0, sunColor: 0xfff1dd,
  fill: 0.06, env: 0.32,
  grid1: 0x27395a, grid2: 0x18233a, gridOp: 0.55,
  ground: 0x0d141f, shadow: 0.16
};

export class Viewer {
  constructor(host, labelHost) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 600);
    this.camera.position.set(5, 3.2, 6.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 阴影按需更新：静态大模型（如解剖图谱）旋转视角时无需每帧重绘阴影贴图
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this._shadowEveryFrame = true;  // 持续动画的模型每帧重绘阴影
    this._shadowDirty = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.localClippingEnabled = true;
    host.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.id = 'labelLayer';
    labelHost.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 90;
    this.controls.autoRotateSpeed = 1.4;
    this.controls.target.set(0, 0.8, 0);
    this.controls.addEventListener('start', () => { this._tween = null; });

    // 环境反射（PBR 质感）
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = DAY.env;

    // 灯光
    this.hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGnd, DAY.hemi);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sun);
    this.sun.position.set(7, 12, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xbfd4ff, DAY.fill);
    this.fill.position.set(-7, 5, -7);
    this.scene.add(this.fill);
    this.moon = new THREE.DirectionalLight(0x93b4ff, 0);
    this.moon.position.set(-5, 9, -6);
    this.scene.add(this.moon);

    // 地面：网格 + 承影面
    this.gridDay = this._makeGrid(DAY.grid1, DAY.grid2, DAY.gridOp);
    this.gridNight = this._makeGrid(NIGHT.grid1, NIGHT.grid2, NIGHT.gridOp);
    this.gridNight.visible = false;
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 64),
      new THREE.MeshStandardMaterial({ color: DAY.ground, roughness: 1, metalness: 0 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.005;
    this.ground.receiveShadow = true;
    this.shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: DAY.shadow })
    );
    this.shadowCatcher.rotation.x = -Math.PI / 2;
    this.shadowCatcher.position.y = 0.002;
    this.shadowCatcher.receiveShadow = true;
    this.scene.add(this.gridDay, this.gridNight, this.ground, this.shadowCatcher);

    // 星空（夜间）
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      const r = 110 + Math.random() * 60;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp[i * 3] = r * Math.sin(p) * Math.cos(t);
      sp[i * 3 + 1] = Math.abs(r * Math.cos(p)) * 0.7 + 6;
      sp[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.55, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.stars);

    // 剖切平面可视化
    this.planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x35d0ff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })
    );
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
      new THREE.LineBasicMaterial({ color: 0x35d0ff, transparent: true, opacity: 0.65 })
    );
    border.position.z = 0.001;
    this.planeMesh.add(border);
    this.planeMesh.visible = false;
    this.scene.add(this.planeMesh);

    this.isNight = false;
    this.model = null;
    this.modelMats = [];
    this._tween = null;
    this._clipPlane = null;

    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._vA = new THREE.Vector3();
    this._vB = new THREE.Vector3();
    this._vC = new THREE.Vector3();

    new ResizeObserver(() => this._resize()).observe(host);
    this._resize();
  }

  _makeGrid(c1, c2, op) {
    const g = new THREE.GridHelper(40, 80, c1, c2);
    g.material.transparent = true;
    g.material.opacity = op;
    return g;
  }

  _resize() {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  /* ---------- 模型 ---------- */
  setModel(model) {
    if (this.modelGroup) {
      // 移除旧模型时同步清掉其 CSS2D 标签 DOM，避免标签残留在新模型场景上
      this.modelGroup.traverse(o => {
        if (o.isCSS2DObject && o.element && o.element.parentNode) {
          o.element.parentNode.removeChild(o.element);
        }
      });
      this.scene.remove(this.modelGroup);
    }
    this.modelGroup = model.group;
    this.model = model;
    this.scene.add(this.modelGroup);

    this.modelMats = [];
    model.group.traverse(o => { if (o.isMesh) this.modelMats.push(o.material); });
    this._shadowEveryFrame = !model.atlas;
    this._shadowDirty = true;

    // 模型底部贴地
    let box = new THREE.Box3().setFromObject(model.group);
    model.group.position.y = -box.min.y;
    model.group.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model.group);
    this.modelBox = box;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.modelRadius = Math.max(size.length() / 2, 0.6);
    this.modelCenter = center;
    // 缩放上限随模型尺度走：A380 这类需要 180m+ 取景距离的大模型不被钳回近景
    this.controls.maxDistance = Math.max(this._fitDistance() * 1.5, 40);

    // 灯光/雾随模型尺度适配
    const r = this.modelRadius;
    this.sun.position.set(center.x + r * 2.2, center.y + r * 3.4, center.z + r * 1.8);
    const s = this.sun.shadow.camera;
    s.left = -r * 2.4; s.right = r * 2.4; s.top = r * 2.4; s.bottom = -r * 2.4;
    s.near = 0.1; s.far = r * 12;
    s.updateProjectionMatrix();
    this.scene.fog = new THREE.Fog(this.isNight ? NIGHT.fog : DAY.fog, r * 8, r * 22);

    // 初始网格密度随尺度调整
    [this.gridDay, this.gridNight].forEach(g => {
      g.scale.setScalar(Math.max(0.55, Math.min(3, r / 2.2)));
    });
  }

  worldCenter(obj) {
    return new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
  }

  /** 标记阴影需要重绘（autoUpdate 关闭时由静态模型按需触发） */
  markShadowDirty() {
    this._shadowDirty = true;
  }

  /* ---------- 相机 ---------- */
  _fitDistance() {
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    const r = this.modelRadius;
    const d = Math.max(r / Math.tan(fov / 2), r / Math.tan(fovH / 2)) * 1.12;
    return d + r * 0.35;
  }

  fitView() {
    const dir = new THREE.Vector3(1.15, 0.72, 1.55).normalize();
    this.tweenCam(
      this.modelCenter.clone().addScaledVector(dir, this._fitDistance()),
      this.modelCenter.clone(), 0.85
    );
  }

  /** 取景指定包围盒（如爆炸网格布局） */
  fitBox(box, dir = new THREE.Vector3(0.1, 0.06, 1).normalize(), padding = 1.28) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    const r = Math.max(size.length() / 2, 0.6);
    const d = Math.max(r / Math.tan(fov / 2), r / Math.tan(fovH / 2)) * padding;
    this.tweenCam(center.clone().addScaledVector(dir, d), center, 0.9);
  }

  view45() {
    const a = Math.PI / 4, e = Math.PI / 6.4; // 方位 45°，仰角约 28°
    const dir = new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
    this.tweenCam(
      this.modelCenter.clone().addScaledVector(dir, this._fitDistance()),
      this.modelCenter.clone(), 0.85
    );
  }

  tweenCam(pos, target, dur = 0.8) {
    this._tween = {
      t: 0, dur,
      p0: this.camera.position.clone(), p1: pos.clone(),
      c0: this.controls.target.clone(), c1: target.clone()
    };
  }

  _stepTween(dt) {
    if (!this._tween) return;
    const tw = this._tween;
    tw.t += dt / tw.dur;
    const k = tw.t >= 1 ? 1 : (tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2);
    this.camera.position.lerpVectors(tw.p0, tw.p1, k);
    this.controls.target.lerpVectors(tw.c0, tw.c1, k);
    if (tw.t >= 1) this._tween = null;
  }

  /* ---------- 昼夜 ---------- */
  setDayNight(night) {
    this.isNight = night;
    const P = night ? NIGHT : DAY;
    this.scene.background = new THREE.Color(P.bg);
    if (this.scene.fog) this.scene.fog.color = new THREE.Color(P.fog);
    this.hemi.color = new THREE.Color(P.hemiSky);
    this.hemi.groundColor = new THREE.Color(P.hemiGnd);
    this.hemi.intensity = P.hemi;
    this.sun.intensity = P.sun;
    this.fill.intensity = P.fill;
    this.moon.intensity = night ? 0.85 : 0;
    this.scene.environmentIntensity = P.env;
    this.gridDay.visible = !night;
    this.gridNight.visible = night;
    this.ground.material.color = new THREE.Color(P.ground);
    this.shadowCatcher.material.opacity = P.shadow;
    this.stars.material.opacity = night ? 0.9 : 0;
    this.renderer.toneMappingExposure = night ? 1.12 : 1.05;
    this._shadowDirty = true;
  }

  /* ---------- 剖切 ---------- */
  setSection(cfg) {
    // cfg: {axis:'x'|'y'|'z', pos:-1..1, flip:bool, show:bool} 或 null 关闭
    if (!cfg) {
      this._clipPlane = null;
      this.planeMesh.visible = false;
      for (const m of this.modelMats) {
        m.clippingPlanes = null;
        if (m.userData._side !== undefined) { m.side = m.userData._side; }
        m.clipShadows = false;
      }
      this._shadowDirty = true;
      return;
    }
    const n = new THREE.Vector3(
      cfg.axis === 'x' ? 1 : 0,
      cfg.axis === 'y' ? 1 : 0,
      cfg.axis === 'z' ? 1 : 0
    );
    if (cfg.flip) n.negate();
    const offset = cfg.pos * this.modelRadius;
    const pivot = this.modelCenter.clone().addScaledVector(n, offset);
    const plane = new THREE.Plane(n.clone(), -n.dot(pivot));
    this._clipPlane = plane;

    const r = this.modelRadius;
    for (const m of this.modelMats) {
      if (m.userData._side === undefined) m.userData._side = m.side;
      m.clippingPlanes = [plane];
      m.side = THREE.DoubleSide;
      m.clipShadows = true;
    }
    this._shadowDirty = true;
    if (cfg.show) {
      this.planeMesh.scale.setScalar(r * 2.35);
      this.planeMesh.position.copy(this.modelCenter).addScaledVector(n, offset);
      this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.planeMesh.visible = true;
    } else {
      this.planeMesh.visible = false;
    }
  }

  /* ---------- 拾取 ---------- */
  pickAt(clientX, clientY, opts = {}) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(this._pointer, this.camera);
    if (this.model?.atlas) return this._pickAtlas(opts);
    const hits = this._raycaster.intersectObject(this.modelGroup, true)
      .filter(h => h.object.isMesh && !h.object.userData.noPick);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.isPartRoot) o = o.parent;
    if (!o) return null;
    return { root: o, info: o.userData.info, point: hits[0].point };
  }

  /** 合并网格拾取：包围盒粗筛候选结构，再对候选三角形区间精确相交。
      approximate=true 时仅用包围盒（悬停改光标用，保证每帧开销极低） */
  _pickAtlas({ approximate = false } = {}) {
    const worldRay = this._raycaster.ray;
    const best = { dist: Infinity, structure: null, mesh: null, point: new THREE.Vector3() };
    const approxBest = { dist: Infinity, structure: null, mesh: null, point: new THREE.Vector3() };
    const localRay = new THREE.Ray();
    const invMat = new THREE.Matrix4();
    const hitPoint = new THREE.Vector3();
    const boxEntry = new THREE.Vector3();

    const walk = o => {
      if (!o.visible) return;   // 父级系统组隐藏则整子树跳过
      if (o.isMesh && o.userData.isSystemMesh) {
        invMat.copy(o.matrixWorld).invert();
        localRay.copy(worldRay).applyMatrix4(invMat);
        const segs = o.userData.segments;
        const pos = o.geometry.attributes.position.array;
        const idx = o.geometry.index.array;
        // 候选粗筛：包围盒与射线相交且入点距离有希望更近
        const candidates = [];
        for (const s of segs) {
          if (!localRay.intersectsBox(s.bounds)) continue;
          const entry = localRay.intersectBox(s.bounds, boxEntry);
          const d = entry ? localRay.origin.distanceTo(entry) : 0;
          if (d < best.dist) candidates.push([d, s, entry ? boxEntry.clone() : null]);
        }
        candidates.sort((a, b) => a[0] - b[0]);
        for (const [d, s, entryPt] of candidates) {
          if (d < approxBest.dist) {
            approxBest.dist = d; approxBest.structure = s; approxBest.mesh = o;
            approxBest.point.copy(entryPt ?? s.bounds.getCenter(new THREE.Vector3())).applyMatrix4(o.matrixWorld);
          }
          if (approximate) {
            if (d < best.dist) { best.dist = d; best.structure = s; best.mesh = o; best.point.copy(approxBest.point); }
            continue;
          }
          // 精确：遍历该结构的三角形
          for (let t = s.triStart * 3; t < s.triEnd * 3; t += 3) {
            this._vA.fromArray(pos, idx[t] * 3);
            this._vB.fromArray(pos, idx[t + 1] * 3);
            this._vC.fromArray(pos, idx[t + 2] * 3);
            const p = localRay.intersectTriangle(this._vA, this._vB, this._vC, false, hitPoint);
            if (!p) continue;
            const dist = localRay.origin.distanceTo(hitPoint);
            if (dist < best.dist) {
              best.dist = dist;
              best.structure = s;
              best.mesh = o;
              best.point.copy(hitPoint).applyMatrix4(o.matrixWorld);
            }
          }
        }
      }
      for (const c of o.children) walk(c);
    };
    walk(this.modelGroup);
    const hit = best.structure ? best : approxBest;
    if (!hit.structure) return null;
    return {
      root: hit.mesh, info: hit.structure.info,
      structure: hit.structure, point: hit.point
    };
  }

  /* ---------- 渲染 ---------- */
  render(dt) {
    this._stepTween(dt);
    this.controls.update();
    if (this._shadowEveryFrame || this._shadowDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this._shadowDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
