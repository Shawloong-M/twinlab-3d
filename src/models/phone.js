// ============ iPhone 17 Pro Max（宇宙橙 Cosmic Orange · 1:1 程序化建模 · 内部堆叠爆炸） ============
// 真实尺寸 163.03 × 77.58 × 8.75 mm ÷ 10 → 高 16.3 / 宽 7.76 / 厚 0.875（分米级，避免小数值精度问题）
// 姿态：直立站于地面 y=0，屏幕朝 +Z，背面朝 -Z
import * as THREE from 'three';
import { M, TAU, part, mesh, addEdges, roundedBox, roundedRectShape, tube } from '../lib.js';

/* ---------- 整机常量 ---------- */
const W = 7.76, H = 16.3, D = 0.875, RD = 1.15;  // 宽 / 高 / 厚 / 外壳圆角半径
const CY = H / 2;                                 // 直立中心高度 8.15
const ZF = D / 2;                                 // 前后面基准 ±0.4375

/* 宇宙橙配色（阳极氧化铝 / 玻璃 / 镜筒） */
const C_FRAME = 0xdc741e, C_PLATEAU = 0xd96f1a, C_GLASS = 0xd4711a, C_BARREL = 0xcf6a18;

/* ---------- 屏幕主题 ---------- */
const THEMES = {
  black:  { stops: ['#04050a', '#0e1319', '#222a35'], glow: 'rgba(150,185,255,0.10)', stars: 0.5, aurora: false },
  purple: { stops: ['#170a30', '#3a1668', '#8a4bdc'], glow: 'rgba(200,130,255,0.20)', stars: 1.0, aurora: false },
  amber:  { stops: ['#241000', '#6e3406', '#d97c1c'], glow: 'rgba(255,175,90,0.18)',  stars: 0.0, aurora: false },
  green:  { stops: ['#02120b', '#0a4a2c', '#27b078'], glow: 'rgba(90,255,190,0.16)',  stars: 0.4, aurora: true }
};
const THEME_NAMES = { black: '深邃黑', purple: '星云紫', amber: '琥珀橙', green: '极光绿' };

/* 24 个主屏应用（标签 / 底色 / 图形符号） */
const APPS = [
  ['电话', '#30d158', 'phone'], ['信息', '#3ddc5b', 'chat'], ['相机', '#676c76', 'cam'], ['照片', '#f2f2f7', 'photo'],
  ['时钟', '#111318', 'clock'], ['天气', '#3a9bfc', 'sun'], ['地图', '#f5f7fa', 'map'], ['备忘录', '#ffd60a', 'note'],
  ['音乐', '#fa2d48', 'music'], ['App Store', '#1d6ff2', 'bag'], ['健康', '#f5f5fa', 'heart'], ['钱包', '#26262a', 'wallet'],
  ['设置', '#898f98', 'gear'], ['日历', '#f5f5fa', 'cal'], ['计算器', '#26262a', 'calc'], ['邮件', '#1d6ff2', 'mail'],
  ['浏览器', '#f2f2f7', 'compass'], ['文件', '#2c8ef8', 'folder'], ['播客', '#8e5cf6', 'pods'], ['图书', '#ff9500', 'book'],
  ['家庭', '#ff9f0a', 'home'], ['提醒事项', '#f5f5fa', 'dots'], ['股市', '#111318', 'chart'], ['语音备忘', '#26262a', 'wave']
];

/* ---------- canvas 绘制工具 ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
}

/** iOS 风格应用图标图形符号（白色矢量小图形） */
function glyph(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = s * 0.5;
  switch (type) {
    case 'phone':
      ctx.beginPath(); ctx.arc(cx, cy + s * 0.06, s * 0.26, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.21, cy + s * 0.13, s * 0.10, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.21, cy + s * 0.13, s * 0.10, 0, TAU); ctx.fill();
      break;
    case 'chat':
      roundRect(ctx, cx - r * 0.82, cy - r * 0.62, r * 1.64, r * 1.15, r * 0.32); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.35, cy + r * 0.45); ctx.lineTo(cx - r * 0.52, cy + r * 0.85); ctx.lineTo(cx - r * 0.05, cy + r * 0.52);
      ctx.closePath(); ctx.fill();
      break;
    case 'cam':
      roundRect(ctx, cx - r * 0.85, cy - r * 0.5, r * 1.7, r * 1.15, r * 0.22); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.06, r * 0.3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 0.28, r * 0.07, 0, TAU); ctx.fill();
      break;
    case 'photo':
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 4);
        ctx.fillStyle = `hsla(${i * 45},85%,60%,0.85)`;
        ctx.beginPath(); ctx.ellipse(0, -r * 0.34, r * 0.17, r * 0.34, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      break;
    case 'clock':
      ctx.fillStyle = '#f5f5f7';
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1c1c1e'; ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r * 0.44);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.3, cy + r * 0.12);
      ctx.stroke();
      break;
    case 'sun':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42);
        ctx.lineTo(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58);
        ctx.stroke();
      }
      break;
    case 'map':
      ctx.strokeStyle = 'rgba(110,190,120,0.9)'; ctx.lineWidth = s * 0.09;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.5); ctx.quadraticCurveTo(cx, cy - r * 0.4, cx + r * 0.7, cy + r * 0.3); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.25, r * 0.16, 0, TAU); ctx.fill();
      break;
    case 'note':
      ctx.lineWidth = s * 0.07;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy + i * r * 0.34); ctx.lineTo(cx + r * 0.55, cy + i * r * 0.34); ctx.stroke();
      }
      break;
    case 'music':
      ctx.beginPath(); ctx.arc(cx - r * 0.3, cy + r * 0.4, r * 0.14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.34, cy + r * 0.3, r * 0.14, 0, TAU); ctx.fill();
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.18, cy + r * 0.38); ctx.lineTo(cx - r * 0.18, cy - r * 0.5);
      ctx.lineTo(cx + r * 0.46, cy - r * 0.62); ctx.lineTo(cx + r * 0.46, cy + r * 0.28);
      ctx.stroke();
      break;
    case 'bag':
      roundRect(ctx, cx - r * 0.62, cy - r * 0.25, r * 1.24, r * 0.95, r * 0.18); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.28, r * 0.28, Math.PI, 0); ctx.stroke();
      break;
    case 'heart':
      ctx.fillStyle = '#ff375f';
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.55);
      ctx.bezierCurveTo(cx - r * 1.0, cy - r * 0.15, cx - r * 0.45, cy - r * 0.8, cx, cy - r * 0.3);
      ctx.bezierCurveTo(cx + r * 0.45, cy - r * 0.8, cx + r * 1.0, cy - r * 0.15, cx, cy + r * 0.55);
      ctx.fill();
      break;
    case 'wallet':
      roundRect(ctx, cx - r * 0.7, cy - r * 0.5, r * 1.4, r * 1.0, r * 0.16); ctx.fill();
      ctx.fillStyle = '#fa2d48'; ctx.fillRect(cx - r * 0.68, cy - r * 0.48, r * 1.36, r * 0.16);
      ctx.fillStyle = '#ffd60a'; ctx.fillRect(cx - r * 0.68, cy - r * 0.3, r * 1.36, r * 0.16);
      ctx.fillStyle = '#30d158'; ctx.fillRect(cx - r * 0.68, cy - r * 0.12, r * 1.36, r * 0.16);
      break;
    case 'gear':
      ctx.lineWidth = s * 0.12;
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 4);
        ctx.beginPath(); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, -r * 0.62); ctx.stroke(); ctx.restore();
      }
      ctx.lineWidth = s * 0.1;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, TAU); ctx.stroke();
      break;
    case 'cal':
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff3b30';
      ctx.font = `600 ${Math.round(s * 0.18)}px sans-serif`;
      ctx.fillText('OCT', cx, cy - s * 0.17);
      ctx.font = `700 ${Math.round(s * 0.46)}px -apple-system, sans-serif`;
      ctx.fillText('24', cx, cy + s * 0.1);
      break;
    case 'calc':
      ctx.fillStyle = '#ff9500';
      roundRect(ctx, cx - r * 0.6, cy - r * 0.62, r * 1.2, r * 0.32, r * 0.1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        ctx.beginPath(); ctx.arc(cx - r * 0.36 + i * r * 0.36, cy + r * 0.08 + j * r * 0.28, r * 0.09, 0, TAU); ctx.fill();
      }
      break;
    case 'mail':
      roundRect(ctx, cx - r * 0.72, cy - r * 0.46, r * 1.44, r * 0.92, r * 0.12); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.64, cy - r * 0.38); ctx.lineTo(cx, cy + r * 0.08); ctx.lineTo(cx + r * 0.64, cy - r * 0.38);
      ctx.stroke();
      break;
    case 'compass':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.66, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.42); ctx.lineTo(cx + r * 0.14, cy); ctx.lineTo(cx - r * 0.14, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.42); ctx.lineTo(cx + r * 0.14, cy); ctx.lineTo(cx - r * 0.14, cy); ctx.closePath(); ctx.fill();
      break;
    case 'folder':
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(ctx, cx - r * 0.66, cy - r * 0.42, r * 1.32, r * 0.84, r * 0.12); ctx.fill();
      ctx.fillStyle = '#fff';
      roundRect(ctx, cx - r * 0.66, cy - r * 0.18, r * 1.32, r * 0.7, r * 0.12); ctx.fill();
      break;
    case 'pods':
      ctx.lineWidth = s * 0.07;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.32, r * 0.2 * i, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.32, r * 0.09, 0, TAU); ctx.fill();
      break;
    case 'book':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.35); ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.5, cx - r * 0.62, cy - r * 0.4);
      ctx.lineTo(cx - r * 0.62, cy + r * 0.4); ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 0.3, cx, cy + r * 0.45);
      ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 0.3, cx + r * 0.62, cy + r * 0.4);
      ctx.lineTo(cx + r * 0.62, cy - r * 0.4); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.5, cx, cy - r * 0.35);
      ctx.lineTo(cx, cy + r * 0.45);
      ctx.stroke();
      break;
    case 'home':
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy); ctx.lineTo(cx, cy - r * 0.55); ctx.lineTo(cx + r * 0.6, cy);
      ctx.stroke();
      roundRect(ctx, cx - r * 0.45, cy - r * 0.05, r * 0.9, r * 0.6, r * 0.08); ctx.fill();
      break;
    case 'dots': {
      const dc = ['#ff3b30', '#ff9500', '#30d158', '#1d6ff2'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = dc[i];
        ctx.beginPath(); ctx.arc(cx - r * 0.42, cy - r * 0.32 + i * r * 0.28, r * 0.1, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = s * 0.05;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.12, cy - r * 0.32 + i * r * 0.28); ctx.lineTo(cx + r * 0.52, cy - r * 0.32 + i * r * 0.28); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      }
      break;
    }
    case 'chart':
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy + r * 0.4); ctx.lineTo(cx - r * 0.25, cy + r * 0.05);
      ctx.lineTo(cx + r * 0.05, cy + r * 0.2); ctx.lineTo(cx + r * 0.6, cy - r * 0.45);
      ctx.stroke();
      break;
    case 'wave': {
      const hs = [0.35, 0.6, 0.9, 0.5];
      for (let i = 0; i < 4; i++) {
        const h = r * hs[i];
        roundRect(ctx, cx - r * 0.45 + i * r * 0.26, cy - h / 2, r * 0.12, h, r * 0.06); ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function drawIcon(ctx, x, y, s, color, g) {
  ctx.save();
  const grd = ctx.createLinearGradient(0, y, 0, y + s);
  grd.addColorStop(0, shade(color, 1.14));
  grd.addColorStop(1, color);
  ctx.fillStyle = grd;
  roundRect(ctx, x, y, s, s, s * 0.235); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, x, y, s, s * 0.48, s * 0.235); ctx.fill();
  glyph(ctx, g, x + s / 2, y + s / 2, s * 0.56);
  ctx.restore();
}

/**
 * 屏幕界面 CanvasTexture（512×1100，非方形纹理）。
 * theme: 主题 key；on: 亮屏；night: 夜间模式加亮
 */
function drawScreen(themeKey, on, night) {
  const CW = 512, CH = 1100;
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');
  const th = THEMES[themeKey] || THEMES.amber;

  // 先铺黑（圆角外的四角区域），再按屏幕圆角裁剪绘制
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CW, CH);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, CW, CH, 56);
  ctx.clip();

  if (on) {
    // 壁纸渐变 + 主题光晕
    const g = ctx.createLinearGradient(0, 0, CW * 0.7, CH);
    g.addColorStop(0, th.stops[0]); g.addColorStop(0.55, th.stops[1]); g.addColorStop(1, th.stops[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    const rg = ctx.createRadialGradient(CW * 0.72, CH * 0.24, 10, CW * 0.72, CH * 0.24, 430);
    rg.addColorStop(0, th.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, CW, CH);
    if (th.stars > 0) {
      const n = Math.round(130 * th.stars);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.10 + (i % 5) * 0.08})`;
        ctx.beginPath();
        ctx.arc((i * 173 + 41) % CW, (i * 211 + 67) % 700, 0.6 + (i % 3) * 0.5, 0, TAU);
        ctx.fill();
      }
    }
    if (th.aurora) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7dffc9'; ctx.lineWidth = 46;
      ctx.beginPath(); ctx.moveTo(-40, 560); ctx.bezierCurveTo(140, 380, 320, 640, 560, 420); ctx.stroke();
      ctx.strokeStyle = '#4be0ff'; ctx.lineWidth = 30;
      ctx.beginPath(); ctx.moveTo(-40, 650); ctx.bezierCurveTo(160, 470, 330, 700, 560, 520); ctx.stroke();
      ctx.restore();
    }

    // 灵动岛（顶部居中药丸形开孔，纯黑）+ 前置相机镜点
    ctx.fillStyle = '#000';
    roundRect(ctx, 134, 10, 244, 72, 36); ctx.fill();
    ctx.fillStyle = '#10151d';
    ctx.beginPath(); ctx.arc(172, 46, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,110,160,0.5)';
    ctx.beginPath(); ctx.arc(172, 46, 3.4, 0, TAU); ctx.fill();

    // 状态栏（岛左时间 / 岛右信号 Wi-Fi 电池）
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '600 30px -apple-system, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('9:41', 66, 48);
    for (let i = 0; i < 4; i++) {
      const bh = 7 + i * 4;
      ctx.fillRect(352 + i * 9, 56 - bh, 6, bh);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(418, 57, 4 + i * 6, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.4;
    roundRect(ctx, 444, 38, 40, 20, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, 447, 41, 28, 14, 3.5); ctx.fill();
    ctx.fillRect(486, 43.5, 3, 9);

    // 大时钟 + 日期
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = night ? 32 : 18;
    ctx.font = '600 148px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText('9:41', CW / 2, 252);
    ctx.shadowBlur = 0;
    ctx.font = '400 31px -apple-system, "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText('10月24日 星期六', CW / 2, 302);

    // 4×6 应用图标网格
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < APPS.length; i++) {
      const x = 44 + (i % 4) * 112, y = 322 + ((i / 4) | 0) * 112;
      drawIcon(ctx, x, y, 88, APPS[i][1], APPS[i][2]);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '400 17px -apple-system, "PingFang SC", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 4;
      ctx.fillText(APPS[i][0], x + 44, y + 108);
      ctx.shadowBlur = 0;
    }

    // Dock（电话 / 浏览器 / 信息 / 音乐）
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, 26, 1002, 460, 72, 26); ctx.fill();
    [0, 16, 1, 8].forEach((idx, k) => {
      drawIcon(ctx, 63 + k * 108, 1007, 62, APPS[idx][1], APPS[idx][2]);
    });

    // Home 指示条
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, 216, 1086, 80, 5, 2.5); ctx.fill();

    // 暗角
    const vg = ctx.createRadialGradient(CW / 2, CH * 0.45, CH * 0.25, CW / 2, CH * 0.5, CH * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);

    // 夜间模式整体增亮
    if (night) {
      ctx.fillStyle = 'rgba(170,200,255,0.055)';
      ctx.fillRect(0, 0, CW, CH);
    }
  } else {
    // 熄屏：深黑 + 仅剩边框斜向反光
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, CW, CH);
    for (const off of [0, 0.3]) {
      const sg = ctx.createLinearGradient(0, 0, CW, CH);
      sg.addColorStop(0.32 + off, 'rgba(255,255,255,0)');
      sg.addColorStop(0.46 + off, 'rgba(255,255,255,0.05)');
      sg.addColorStop(0.6 + off, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, CW, CH);
    }
    const cg = ctx.createRadialGradient(60, 40, 5, 60, 40, 300);
    cg.addColorStop(0, 'rgba(255,255,255,0.05)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, CW, CH);
    // 灵动岛隐约可见的轮廓
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    roundRect(ctx, 134, 10, 244, 72, 36); ctx.fill();
  }

  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- 镜头组件（外圈抛光铝亮环 + 凸起镜筒 + 深黑蓝宝石镜片 + 内部同心反光） ---------- */
function buildLens(R, protr) {
  const g = new THREE.Group();
  const tip = -(protr + 0.02);   // 镜筒前端（朝 -Z 背面外侧）

  // 凸起镜筒（抛光宇宙橙铝）
  const barrel = mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, protr + 0.04, 40), M.metal(C_BARREL, 0.28, 0.9), 0, 0, -protr / 2);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);

  // 抛光铝亮环
  const ring = mesh(new THREE.TorusGeometry(R, 0.055, 14, 48), M.chrome(0xe9edf2), 0, 0, tip + 0.045);
  ring.userData.noEdges = true;
  g.add(ring);

  // 环内黑色密封圈
  const bm = mesh(new THREE.TorusGeometry(R - 0.075, 0.028, 10, 40), M.plastic(0x0a0d12, 0.4), 0, 0, tip + 0.06);
  bm.userData.noEdges = true;
  g.add(bm);

  // 蓝宝石镜片（深黑玻璃）
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1017, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.5
  });
  const lens = mesh(new THREE.CylinderGeometry(R - 0.095, R - 0.095, 0.025, 40), lensMat, 0, 0, tip + 0.055);
  lens.rotation.x = Math.PI / 2;
  lens.userData.noEdges = true;
  g.add(lens);

  // 镜筒内壁（深黑消光腔体）
  const wall = mesh(new THREE.CylinderGeometry(R - 0.09, R - 0.09, 0.24, 32), M.plastic(0x06080b, 0.5), 0, 0, tip + 0.19);
  wall.rotation.x = Math.PI / 2;
  wall.userData.noEdges = true;
  g.add(wall);

  // 镜片后微反光同心圆 + 内部镜片
  const reflM = M.metal(0x42537a, 0.18, 1);
  [[R * 0.52, tip + 0.11, 36], [R * 0.30, tip + 0.145, 28]].forEach(([rr, zz, seg]) => {
    const t = mesh(new THREE.TorusGeometry(rr, 0.009, 8, seg), reflM, 0, 0, zz);
    t.userData.noEdges = true;
    g.add(t);
  });
  const elem = mesh(new THREE.CylinderGeometry(R * 0.26, R * 0.26, 0.02, 24), M.glass(0x0d1522, 0.5), 0, 0, tip + 0.125);
  elem.rotation.x = Math.PI / 2;
  elem.userData.noEdges = true;
  g.add(elem);

  // 底部传感器面
  const sensor = mesh(new THREE.CircleGeometry(R - 0.11, 32), M.plastic(0x04060a, 0.3), 0, 0, tip + 0.185);
  sensor.rotation.y = Math.PI;
  sensor.userData.noEdges = true;
  g.add(sensor);
  return g;
}

/* ============================================================ */
export function buildPhone() {
  const group = new THREE.Group();
  const parts = [];

  const P = (root, info, explode) => {
    parts.push({ root: part(group, root, info), ...(explode ? { explode } : {}) });
    return root;
  };

  /* ---- 1. 一体化铝合金中框（unibody，宇宙橙阳极氧化 + 天线断点） ---- */
  {
    const root = new THREE.Group();
    const s = roundedRectShape(W, H, RD);
    const hole = roundedRectShape(W - 0.10, H - 0.10, RD - 0.05);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: D - 0.04, curveSegments: 24, bevelEnabled: true,
      bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 2
    });
    geo.translate(0, 0, -0.4175);   // z ∈ [-0.4375, 0.4375]，前后带高光倒角
    root.add(mesh(geo, M.metal(C_FRAME, 0.4, 0.85)));

    // 天线断点（注塑细缝）：左右各 2、上下各 2（底部齐平地面不越界）
    const bandMat = M.plastic(0xb95f14, 0.72);
    [-1, 1].forEach(sx => [-2.85, 2.85].forEach(by =>
      root.add(mesh(new THREE.BoxGeometry(0.05, 0.06, 0.85), bandMat, sx * (W / 2 + 0.002), by, 0))));
    [-1, 1].forEach(sy => [-2.85, 2.85].forEach(bx =>
      root.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.85), bandMat, bx, sy * (H / 2 - (sy > 0 ? 0.005 : 0.03)), 0))));

    root.position.set(0, CY, 0);
    addEdges(root, 28);
    P(root, { name: '铝合金一体中框', en: 'Aluminum Unibody Frame', role: 'structure',
      desc: '航空级 7000 系铝合金由整块坯料 CNC 铣削成一体化 unibody，相机高原与中框同源加工。边框嵌入注塑天线断点分割电流环路避免信号屏蔽，阳极氧化染色呈现宇宙橙，外缘倒角经精车与喷砂两道工序形成高光。' },
      [0.4, 0, 0.6]);
  }

  /* ---- 2. OLED 屏幕（超视网膜 XDR + 四边等窄边框 + 灵动岛） ---- */
  const screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  screenMat.map = drawScreen('amber', true, false);
  {
    const root = new THREE.Group();
    // BM 黑边框面板
    const bezelGeo = new THREE.ExtrudeGeometry(roundedRectShape(7.72, 16.26, 1.12), { depth: 0.03, bevelEnabled: false });
    bezelGeo.translate(0, 0, 0.3575);
    root.add(mesh(bezelGeo, M.plastic(0x05070a, 0.4)));
    // OLED 发光层（Canvas UI）
    const panel = mesh(new THREE.PlaneGeometry(7.46, 16.0), screenMat, 0, 0, 0.394);
    panel.userData.noEdges = true;
    root.add(panel);
    // 盖板玻璃（微微下沉于中框端面）
    const glassGeo = new THREE.ExtrudeGeometry(roundedRectShape(7.70, 16.24, 1.12), { depth: 0.022, bevelEnabled: false });
    glassGeo.translate(0, 0, 0.4115);
    const glass = mesh(glassGeo, M.glass(0xeaf4ff, 0.07));
    glass.userData.noEdges = true;
    root.add(glass);

    root.position.set(0, CY, 0);
    addEdges(root, 40);
    P(root, { name: 'OLED 屏幕', en: 'Super Retina XDR Display', role: 'core',
      desc: '6.9 英寸超视网膜 XDR OLED，LTPO 2.0 背板 1-120Hz 自适应刷新，户外峰值亮度 3500 尼特。四边等窄边框由 BM 黑矩阵与 OLED 齐边封装实现，顶部灵动岛集成了前置相机与 Face ID 传感开窗。' },
      [0, 0, 1.5]);
  }

  /* ---- 3. 后玻璃盖板（哑光橙玻璃 + 中部圆形高光区） ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(7.70, 16.24, 1.12), { depth: 0.066, bevelEnabled: false });
    geo.translate(0, 0, -0.4335);   // z ∈ [-0.4335, -0.3675]
    root.add(mesh(geo, new THREE.MeshPhysicalMaterial({
      color: C_GLASS, roughness: 0.58, metalness: 0.08, clearcoat: 0.3, clearcoatRoughness: 0.5
    })));
    // 中部高光区（无线充电窗，不绘任何标识）
    const disc = mesh(new THREE.CircleGeometry(1.55, 48), new THREE.MeshPhysicalMaterial({
      color: 0xe07c22, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12
    }), 0, 0, -0.436);
    disc.rotation.y = Math.PI;
    disc.userData.noEdges = true;
    root.add(disc);
    const halo = mesh(new THREE.TorusGeometry(1.78, 0.012, 8, 64), M.metal(0xe8954a, 0.35, 0.6), 0, 0, -0.4365);
    halo.userData.noEdges = true;
    root.add(halo);

    root.position.set(0, CY, 0);
    addEdges(root, 30);
    P(root, { name: '后玻璃盖板', en: 'Matte Back Glass', role: 'shell',
      desc: '哑光 AG 玻璃后盖经化学蚀刻与等离子抛光形成漫反射雾面，不留指纹。中部高光圆区为无线充电窗，玻璃局部减薄以降低感应涡流损耗，与铝框架通过密封胶圈实现 IP68 级防尘防水。' },
      [0, 0.35, -1.35]);
  }

  /* ---- 4. 全宽相机高原（17 Pro Max 身份特征：横贯机身全宽的凸起平台） ---- */
  {
    const root = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(7.56, 5.6, 1.35), {
      depth: 0.14, curveSegments: 24, bevelEnabled: true,
      bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 3
    });
    geo.translate(0, 0, -0.6275);   // z ∈ [-0.6775, -0.4375]，凸起约 2.4mm
    root.add(mesh(geo, M.metal(C_PLATEAU, 0.45, 0.85)));

    root.position.set(0, 13.32, 0);
    addEdges(root, 28);
    P(root, { name: '相机高原', en: 'Camera Plateau', role: 'structure',
      desc: '全宽相机高原由整块铝合金铣削凸起，大圆角过渡分散应力并兼作散热通路。平台将三摄、闪光灯与激光雷达统一收纳，构成 17 Pro Max 最具辨识度的横向视觉带。' },
      [0, 0.9, -1.2]);
  }

  /* ---- 5. 主摄镜头（4800 万 Fusion，左上，直径约 1.7） ---- */
  {
    const root = buildLens(0.85, 0.30);
    root.position.set(-2.55, 14.62, -0.6775);
    addEdges(root, 40);
    P(root, { name: '主摄镜头', en: 'Fusion Main Camera', role: 'core',
      desc: '4800 万像素 Fusion 主摄，1/1.28 英寸大底传感器配 f/1.78 七片式镜组，支持传感器位移式光学防抖。蓝宝石镜片盖板莫氏硬度 9 抗刮花，筒内多层镀膜抑制眩光鬼影。' },
      [-0.75, 0.75, -1.5]);
  }

  /* ---- 6. 超广角镜头（左下，直径约 1.5） ---- */
  {
    const root = buildLens(0.75, 0.26);
    root.position.set(-2.55, 12.07, -0.6775);
    addEdges(root, 40);
    P(root, { name: '超广角镜头', en: 'Ultra Wide Camera', role: 'core',
      desc: '4800 万像素超广角，13mm 等效焦距 f/2.2 光圈，支持 0.5x 视角与 2cm 微距。镜组内置畸变矫正光学设计与对焦马达，边缘画质经再映射算法修正。' },
      [-0.9, -0.35, -1.5]);
  }

  /* ---- 7. 长焦镜头（右侧居中，直径约 1.5） ---- */
  {
    const root = buildLens(0.75, 0.26);
    root.position.set(-0.75, 13.32, -0.6775);
    addEdges(root, 40);
    P(root, { name: '长焦镜头', en: 'Tetraprism Telephoto', role: 'core',
      desc: '四反射镜潜望式长焦，等效 100mm f/2.8，光学 4x、算法 8x 变焦。光线在棱镜内折转四次把长光路折叠进机身厚度，配合 3D 传感器位移 OIS 抵消长焦抖动。' },
      [-0.35, -0.9, -1.5]);
  }

  /* ---- 8. 闪光灯与 LiDAR（高原右侧） ---- */
  {
    const root = new THREE.Group();
    // 原彩闪光灯
    const fr = mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 32), M.chrome(0xd9dde3), 0, 0.83, -0.685);
    fr.userData.noEdges = true;
    root.add(fr);
    const fd = mesh(new THREE.CircleGeometry(0.245, 32), M.emis(0xffe9c0, 0.55), 0, 0.83, -0.683);
    fd.rotation.y = Math.PI;
    fd.userData.noEdges = true;
    root.add(fd);
    const fc = mesh(new THREE.CircleGeometry(0.12, 24), M.emis(0xfff7e6, 0.9), 0, 0.83, -0.681);
    fc.rotation.y = Math.PI;
    fc.userData.noEdges = true;
    root.add(fc);
    // LiDAR（深色玻璃圆窗）
    const lr = mesh(new THREE.TorusGeometry(0.33, 0.04, 10, 32), M.plastic(0x0c0f14, 0.4), 0, -0.82, -0.69);
    lr.userData.noEdges = true;
    root.add(lr);
    const lg = mesh(new THREE.CircleGeometry(0.30, 32), new THREE.MeshPhysicalMaterial({
      color: 0x0a0d12, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1
    }), 0, -0.82, -0.688);
    lg.rotation.y = Math.PI;
    lg.userData.noEdges = true;
    root.add(lg);
    const ld = mesh(new THREE.CircleGeometry(0.09, 20), M.plastic(0x233046, 0.3), 0, -0.82, -0.686);
    ld.rotation.y = Math.PI;
    ld.userData.noEdges = true;
    root.add(ld);
    // 后置麦克风小孔
    const mic = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), M.plastic(0x05070a, 0.5), 1.0, 0.83, -0.682);
    mic.rotation.x = Math.PI / 2;
    root.add(mic);

    root.position.set(1.75, 13.32, 0);
    P(root, { name: '闪光灯与 LiDAR', en: 'Flash & LiDAR', role: 'internal',
      desc: '原彩闪光灯双色 LED 依环境色温混合输出补光。激光雷达以 940nm VCSEL 激光阵列飞行时间测距，夜间对焦速度提升 6 倍，旁侧开孔为视频收音的后置麦克风。' },
      [1.1, 0.15, -1.35]);
  }

  /* ---- 9. 主板与 A19 Pro（双层堆叠 + 铝散热均热板） ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(3.6, 4.0, 0.08), M.plastic(0x143826, 0.6)));
    // 电磁屏蔽罩（拉丝铝）
    root.add(mesh(new THREE.BoxGeometry(3.3, 3.7, 0.05), M.brushed(0xbcc6d0), 0, 0, 0.155));
    // A19 Pro SoC + RAM + 基带
    root.add(mesh(new THREE.BoxGeometry(1.05, 1.05, 0.09), M.metal(0x1a1e26, 0.35, 0.8), 0.85, 1.05, 0.0825));
    root.add(mesh(new THREE.BoxGeometry(0.62, 1.25, 0.07), M.plastic(0x22272f, 0.5), -0.9, 0.95, 0.075));
    root.add(mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), M.plastic(0x2a3038, 0.5), -0.55, -0.75, 0.07));
    // 小颗电源 / 射频芯片
    [[0.7, -0.7], [-1.1, -1.3], [1.2, -1.5], [-1.3, 0.1]].forEach(([cx2, cy2]) =>
      root.add(mesh(new THREE.BoxGeometry(0.34, 0.24, 0.05), M.plastic(0x333a45, 0.5), cx2, cy2, 0.065)));
    [[0.5, 1.4], [-1.2, -0.5]].forEach(([cx2, cy2]) =>
      root.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.04), M.plastic(0x2a3038, 0.5), cx2, cy2, -0.06)));
    // 铝散热均热板（板背）
    root.add(mesh(new THREE.BoxGeometry(3.45, 3.85, 0.04), M.brushed(0xa8b2bd), 0, 0, -0.075));
    // 电池连接器软板
    root.add(mesh(new THREE.BoxGeometry(0.55, 0.2, 0.02), M.metal(0xc9a13b, 0.35, 0.9), 0, -2.08, 0.05));

    root.position.set(0, 12.35, 0.02);
    addEdges(root, 40);
    P(root, { name: '主板与 A19 Pro', en: 'Logic Board & A19 Pro', role: 'core',
      desc: 'S5 双层堆叠主板较传统设计节省约 40% 竖直空间，A19 Pro 基于 3nm 级制程集成 6 核 CPU/GPU 与神经网络引擎。石墨烯导热膜与铝均热板把芯片热量导入一体化铝框架耗散。' },
      [0, 1.35, 0.15]);
  }

  /* ---- 10. L 形电池（5088mAh 双电芯） ---- */
  {
    const root = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-2.7, -3.5); s.lineTo(2.7, -3.5); s.lineTo(2.7, 0.6);
    s.lineTo(0.7, 0.6); s.lineTo(0.7, 3.5); s.lineTo(-2.7, 3.5);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.20, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2
    });
    geo.translate(0, 0, -0.1);
    root.add(mesh(geo, M.plastic(0x252b33, 0.5)));
    // 钢壳封装面 + 参数标签 + 出线软板
    root.add(mesh(new THREE.BoxGeometry(3.0, 2.4, 0.006), M.metal(0x99a3ad, 0.4, 0.85), -1.0, 1.5, 0.128));
    root.add(mesh(new THREE.BoxGeometry(2.2, 1.2, 0.004), M.plastic(0x3a424c, 0.55), -1.0, -1.6, 0.128));
    root.add(mesh(new THREE.BoxGeometry(0.8, 0.5, 0.03), M.metal(0xb5913c, 0.35, 0.9), 1.7, 0.95, 0));

    root.position.set(0.1, 4.7, 0);
    addEdges(root, 35);
    P(root, { name: 'L 形电池', en: 'L-shaped Battery', role: 'internal',
      desc: '5088mAh L 形双电芯锂离子电池，叠片工艺与钢壳封装能量密度达约 800Wh/L。异形轮廓为扬声器腔体与潜望模组让出空间，支持 40W 有线快充与 15W 磁吸无线充电。' },
      [0, 0.5, 1.1]);
  }

  /* ---- 11. 无线充电线圈（铜箔平面螺旋 + 磁吸环 + 充电光环） ---- */
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.08, 0.06, 10, 64),
    new THREE.MeshStandardMaterial({ color: 0x0c1410, emissive: 0x2bd98a, emissiveIntensity: 0, roughness: 0.4, metalness: 0.1 })
  );
  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 40),
    new THREE.MeshBasicMaterial({ color: 0x2bd98a, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glowDisc.rotation.y = Math.PI;
  [glowRing, glowDisc].forEach(o => { o.visible = false; o.castShadow = false; o.userData.noEdges = true; });
  {
    const root = new THREE.Group();
    // 利兹线平面螺旋（盘绕铜管）
    const coilPts = [];
    const TURNS = 4.25, N = 200;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = t * TURNS * Math.PI * 2;
      const r = 0.32 + t * 1.5;
      coilPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const coil = tube(coilPts, 0.045, M.metal(0xc9852f, 0.32, 0.95), 260);
    coil.userData.noEdges = true;
    root.add(coil);
    // 铁氧体隔磁片
    const ferrite = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.02, 48), M.plastic(0x1b2026, 0.6), 0, 0, -0.055);
    ferrite.rotation.x = Math.PI / 2;
    root.add(ferrite);
    // 磁吸阵列环
    const mag = mesh(new THREE.TorusGeometry(2.02, 0.05, 8, 48), M.metal(0x99a1ab, 0.4, 0.9), 0, 0, 0.02);
    mag.userData.noEdges = true;
    root.add(mag);
    // 充电光环（开启无线充电时缓发光）
    glowRing.position.set(0, 0, -0.2285);
    glowDisc.position.set(0, 0, -0.2365);
    root.add(glowRing, glowDisc);

    root.position.set(0, 5.0, -0.27);
    P(root, { name: '无线充电线圈', en: 'Wireless Charging Coil', role: 'internal',
      desc: 'MagSafe 接收线圈为利兹线绕制的平面螺旋，多股绞合抑制趋肤效应损耗。外围钕磁铁环形阵列提供对位吸附，Qi2 磁吸协议下 15W 无线快充，铁氧体片隔离涡流发热。' },
      [0, 0.25, -1.3]);
  }

  /* ---- 12. 扬声器与震动马达 ---- */
  {
    const root = new THREE.Group();
    root.add(mesh(new THREE.BoxGeometry(1.35, 0.72, 0.24), M.plastic(0x14181f, 0.55), -2.85, -0.65, 0));
    root.add(mesh(new THREE.BoxGeometry(1.35, 0.72, 0.24), M.plastic(0x14181f, 0.55), 2.85, -0.65, 0));
    root.add(mesh(new THREE.BoxGeometry(1.7, 0.9, 0.2), M.metal(0x5a6068, 0.4, 0.85), 0.7, -0.48, 0));
    root.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.06), M.plastic(0x3a4048, 0.5), 0.95, -0.48, -0.13));
    root.add(mesh(new THREE.BoxGeometry(2.7, 0.16, 0.02), M.plastic(0x8a6d2f, 0.6), 0, -0.85, 0.12));

    root.position.set(0, 1.2, 0);
    addEdges(root, 40);
    P(root, { name: '扬声器与马达', en: 'Speakers & Haptic Engine', role: 'internal',
      desc: '底部超线性双扬声器与 X 轴线性马达：动子在磁场中以约 200Hz 谐振往复，触觉引擎波形库模拟实体按键按压回馈。声学腔体与底部开孔对齐构成立体声场。' },
      [0, 0.55, 1.25]);
  }

  /* ---- 13. 按键与 USB-C 接口（左三键 / 右电源键 / 底部接口与开孔） ---- */
  {
    const root = new THREE.Group();
    const btnMat = M.metal(C_FRAME, 0.38, 0.85);
    // 左侧：音量 + / 音量 - / 拍照控制
    root.add(mesh(roundedBox(0.09, 1.0, 0.24, 0.034), btnMat, -3.92, 9.35, 0));
    root.add(mesh(roundedBox(0.09, 1.0, 0.24, 0.034), btnMat, -3.92, 8.05, 0));
    root.add(mesh(roundedBox(0.09, 1.35, 0.26, 0.034), btnMat, -3.93, 6.5, 0));
    root.add(mesh(new THREE.BoxGeometry(0.014, 1.12, 0.12), M.plastic(0x9c4f12, 0.6), -3.982, 6.5, 0));
    // 右侧：电源键
    root.add(mesh(roundedBox(0.09, 1.9, 0.26, 0.034), btnMat, 3.92, 9.1, 0));
    // 底部：USB-C 接口 + 扬声器开孔 ×6 + 麦克风孔
    root.add(mesh(roundedBox(1.5, 0.5, 0.3, 0.07), M.metal(0x70767e, 0.4, 0.85), 0, 0.28, 0));
    root.add(mesh(new THREE.BoxGeometry(1.2, 0.07, 0.11), M.plastic(0x08090c, 0.5), 0, 0.052, 0));
    for (let i = 0; i < 6; i++) {
      root.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.1, 12), M.plastic(0x0a0c10, 0.5), 0.85 + i * 0.16, 0.05, 0));
    }
    root.add(mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 12), M.plastic(0x0a0c10, 0.5), -1.35, 0.05, 0));

    addEdges(root, 35);
    P(root, { name: '按键与 USB-C', en: 'Buttons & USB-C', role: 'structure',
      desc: '左侧音量键与拍照控制键（电容感应 + 压感双层结构，支持滑动变焦与轻按半档），右侧电源键内嵌锅仔片与防水胶圈。底部 USB-C 3.2 接口支持 10Gb/s 数据与 DisplayPort 视频输出。' },
      [-0.95, 0.4, 1.05]);
  }

  /* ---- 参数面板 ---- */
  const params = [
    { id: 'screenOn', label: '屏幕显示', type: 'toggle', value: true },
    {
      id: 'theme', label: '壁纸主题', type: 'select', value: 'amber',
      options: [
        { v: 'black', label: '深邃黑' }, { v: 'purple', label: '星云紫' },
        { v: 'amber', label: '琥珀橙' }, { v: 'green', label: '极光绿' }
      ]
    },
    { id: 'wireless', label: '无线充电', type: 'toggle', value: false }
  ];

  group.position.y = 0.02;   // 补偿中框倒角外扩，确保底面贴地 y=0

  /** 状态变化时重绘屏幕 canvas（含夜间增亮），并驱动无线充电光环 */
  function update(dt, t, p, ctx) {
    const night = !!(ctx && ctx.night);
    const key = `${p.theme}|${p.screenOn ? 1 : 0}|${night ? 1 : 0}`;
    if (screenMat.userData.texKey !== key) {
      const old = screenMat.map;
      screenMat.map = drawScreen(p.theme, p.screenOn, night);
      screenMat.needsUpdate = true;
      screenMat.userData.texKey = key;
      if (old) old.dispose();
    }
    const charging = !!p.wireless;
    glowRing.visible = charging;
    glowDisc.visible = charging;
    if (charging) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      glowRing.material.emissiveIntensity = 0.8 + 0.4 * pulse;
      glowDisc.material.opacity = 0.05 + 0.05 * pulse;
    }
  }

  return {
    group, parts, params, update,
    hud: () => `iPhone 17 Pro Max · 屏幕${params[0].value ? '点亮' : '熄灭'} · ${THEME_NAMES[params[1].value] || ''}` +
      (params[2].value ? ' · 无线充电 15W' : '')
  };
}
