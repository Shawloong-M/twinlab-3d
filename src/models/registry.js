// ============ 模型注册表：在此新增分类/模型，界面自动生成入口 ============
import { buildHumanAtlas } from './humanAtlas.js';
import { buildEngine } from './engine.js';
import { buildCar } from './car.js';
import { buildHouse } from './house.js';
import { buildAirplane } from './airplane.js';
import { buildPhone } from './phone.js';
import { buildLaptop } from './laptop.js';

const svg = (paths) =>
  `<svg viewBox="0 0 24 24">${paths}</svg>`;

export const ICONS = {
  human: svg('<circle cx="12" cy="5" r="2.4"/><path d="M12 8v6M12 14l-3.5 7M12 14l3.5 7M7.5 10.5h9"/>'),
  engine: svg('<rect x="8" y="3" width="8" height="6" rx="1"/><path d="M12 9v4M6 13h12l2 4v4H4v-8zM4 17H2M20 17h2"/>'),
  car: svg('<path d="M4 16l1.4-4.2A2 2 0 0 1 7.3 10h9.4a2 2 0 0 1 1.9 1.4L20 16v3.5h-2.4a1.6 1.6 0 0 1-3.2 0h-4.8a1.6 1.6 0 0 1-3.2 0H4z"/><circle cx="7.5" cy="17" r=".4"/><circle cx="16.5" cy="17" r=".4"/>'),
  house: svg('<path d="M4 11l8-6.5L20 11"/><path d="M6 9.8V20h12V9.8"/><path d="M10 20v-5.5h4V20"/>'),
  plane: svg('<path d="M10.5 20.5l1.2-6-6.7.4L3 12l17-8-3.6 15-3.4-3.4-1.4 4.5z"/>'),
  phone: svg('<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18.5h2"/>'),
  laptop: svg('<rect x="5" y="4.5" width="14" height="9.5" rx="1.2"/><path d="M3 19h18l-1.6-3H4.6z"/>')
};

/** 模型目录：新增条目即可在顶部标签栏出现 */
export const MODELS = [
  {
    id: 'human', name: '人体解剖', sub: 'BODY ATLAS', icon: ICONS.human,
    desc: 'BodyParts3D 真实解剖数据：2234 个命名结构 · 15 大系统 · 229 万三角面',
    build: buildHumanAtlas
  },
  {
    id: 'engine', name: '发动机', sub: 'ENGINE', icon: ICONS.engine,
    desc: '丰田 2JZ-GTE 直列六缸双涡轮：曲柄连杆运动学、双涡轮联动、前端附件驱动',
    build: buildEngine
  },
  {
    id: 'car', name: '轿车', sub: 'CAR', icon: ICONS.car,
    desc: '保时捷 911 (992)：贯穿式尾灯、可升降尾翼、五联仪表、后置水平对置六缸',
    build: buildCar
  },
  {
    id: 'house', name: '别墅', sub: 'HOUSE', icon: ICONS.house,
    desc: '现代两层平顶别墅：泳池/车库/阳台/庭院围墙/太阳能板，室内全屋家具',
    build: buildHouse
  },
  {
    id: 'airplane', name: '客机', sub: 'AIRLINER', icon: ICONS.plane,
    desc: '空客 A380-800：72.7m 双层机身、22 轮起落架、4 发翼吊、翼梢翼刀',
    build: buildAirplane
  },
  {
    id: 'phone', name: '智能手机', sub: 'PHONE', icon: ICONS.phone,
    desc: 'iPhone 17 Pro Max：全宽相机高原三摄、灵动岛、USB-C、内部堆叠爆炸',
    build: buildPhone
  },
  {
    id: 'laptop', name: '笔记本电脑', sub: 'LAPTOP', icon: ICONS.laptop,
    desc: '内部硬件一览，屏幕开合与散热风扇',
    build: buildLaptop
  }
];

/** 运行时扩展接口（控制台可用）：window.DTW.registerModel({...}) */
export function registerModel(def) {
  if (!def.id || typeof def.build !== 'function') {
    throw new Error('registerModel 需要 { id, name, icon?, desc?, build() }');
  }
  MODELS.push(def);
  window.dispatchEvent(new CustomEvent('dtw:model-registered', { detail: def.id }));
  return def.id;
}
