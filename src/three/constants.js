/**
 * 房间与场景的全局常量。
 * 单位：米（Blender 里也请用米，并在导出前 Ctrl+A 应用旋转/缩放）。
 */

export const ROOM = {
  width: 7.0, // X 轴
  depth: 6.0, // Z 轴
  height: 2.9, // Y 轴
  wallThickness: 0.12,
}

export const HALF = {
  x: ROOM.width / 2, // 3.5
  z: ROOM.depth / 2, // 3.0
}

/** 玩家眼睛高度 */
export const EYE_HEIGHT = 1.62
/** 玩家碰撞半径 */
export const PLAYER_RADIUS = 0.34
/** 行走 / 奔跑速度 (m/s) */
export const WALK_SPEED = 2.5
export const RUN_SPEED = 4.2

/** 出生点：南墙门口，面朝房间内部（Three.js 默认朝 -Z） */
export const SPAWN = { x: 0, z: 2.25 }

/**
 * 三档时间预设。
 * 所有数值会被 Tween 平滑插值，所以可以直接改这里做你自己的天气。
 */
export const TIME_PRESETS = {
  day: {
    label: '白天',
    ambient: { color: '#e2dccd', intensity: 0.62 },
    hemi: { sky: '#a3c6ff', ground: '#7d5535', intensity: 0.42 },
    sun: { color: '#ffeec6', intensity: 5.6, position: [-3.2, 4.4, -10] },
    lamp: 0.12,
    deskLamp: 0.18,
    ceilingLamp: 0.05,
    skyTop: '#3f9be6',
    skyHorizon: '#dff1ff',
    skyBottom: '#b9d9ee',
    stars: 0.0,
    exposure: 1.0,
    fireplace: 0.0,
  },
  dusk: {
    label: '黄昏',
    ambient: { color: '#ffc9a8', intensity: 0.58 },
    hemi: { sky: '#ffb27a', ground: '#553a46', intensity: 0.42 },
    sun: { color: '#ff9350', intensity: 2.8, position: [-9.5, 2.8, -8] },
    lamp: 0.65,
    deskLamp: 0.95,
    ceilingLamp: 0.85,
    skyTop: '#2d3d7a',
    skyHorizon: '#ff9d6c',
    skyBottom: '#8e5b7a',
    stars: 0.25,
    exposure: 1.0,
    fireplace: 0.0,
  },
  night: {
    label: '夜晚',
    ambient: { color: '#7d8fd6', intensity: 0.22 },
    hemi: { sky: '#2a3766', ground: '#141420', intensity: 0.22 },
    sun: { color: '#9fb8ff', intensity: 0.7, position: [6, 8, -7] },
    lamp: 0.95,
    deskLamp: 1.25,
    ceilingLamp: 1.35,
    skyTop: '#050816',
    skyHorizon: '#1b2a55',
    skyBottom: '#070912',
    stars: 1.0,
    exposure: 1.12,
    fireplace: 0.0,
  },
}

export const TIME_ORDER = ['day', 'dusk', 'night']
