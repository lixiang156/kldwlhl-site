import { Group } from '@tweenjs/tween.js'

/**
 * @tweenjs/tween.js v25 之后，new Tween(object) 默认不会加入任何 Group，
 * 必须显式指定 group 并每帧 update，否则动画永远停在起点。
 *
 * 全项目共用一个 Group，BedroomApp 的渲染循环里统一 update。
 */
export const tweenGroup = new Group()
