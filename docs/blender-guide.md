# Blender 建模与导出规范

这份文档的目标：**你在 Blender 里怎么摆，网页里就是什么样** —— 不翻转、不发黑、不穿墙。

---

## 1. 单位与尺度

| 项目 | 设置 |
| --- | --- |
| 单位 | 米（Metric, Scale = 1.0） |
| 房间尺寸 | 7m（X）× 6m（Z）× 2.9m（Y 高） |
| 墙厚 | 0.12m |
| 门 | 宽 0.96m，高 2.08m |
| 窗 | 宽 2.3m，高 1.45m，窗台 0.95m |
| 桌面高 | 0.75m |
| 玩家眼睛高度 | 1.62m（代码里写死，不用建模） |

> 房间原点在**地板中心**，地板 y = 0。这样导出后 Three.js 里直接落在 y=0 上。

---

## 2. 建模时必须做的三件事

### ① Ctrl + A → 应用旋转和缩放

选中所有物体 → `Ctrl + A` → **Rotation & Scale**。
否则导出后模型可能被压扁、变大、或材质 UV 拉伸。

### ② 删掉 Blender 的灯光和相机

场景里默认带着 Light 和 Camera，**全部删掉**。
灯光完全交给 Three.js（见 `src/three/Lighting.js`），相机由 PointerLockControls 创建。

导出面板里再确认一次 **不勾选** `Cameras` 和 `Punctual Lights`。

### ③ 模型朝上、朝前

- 向上轴：**Y**
- 向前轴：**-Z**

这是 Three.js 的约定，也是 glTF 的标准。Blender 默认 Z 向上，
glTF 导出器会自动转换（+Y up），所以**用默认设置就好，不要手动旋转模型**。

判断方法：导出后在网页里打开，人应该是站着的，不是躺着的。

---

## 3. 导出设置

`File → Export → glTF 2.0 (.glb/.gltf)`

| 选项 | 值 |
| --- | --- |
| Format | **glTF Binary (.glb)** |
| Include → Cameras | 取消 |
| Include → Punctual Lights | 取消 |
| Transform → +Y Up | 勾选 |
| Data → Mesh → Apply Modifiers | 勾选 |
| Data → Mesh → **Draco Compression** | 勾选（体积能小一半） |
| Data → Mesh → Normals | 勾选 |
| Data → Mesh → Tangents | 需要法线贴图时才勾 |
| Data → Images | Automatic |

> 勾了 Draco 之后，网页端必须有解码器。本项目在 `npm run dev` / `npm run build` 时
> 会自动把 three 自带的 Draco 解码器复制到 `public/draco/`。

---

## 4. 命名约定（关键）

代码靠名字前缀识别交互物体，**不需要写一行 JavaScript**。

### 可点击物体

| 命名 | 行为 | 可选自定义属性 |
| --- | --- | --- |
| PICK_photo_1 | 弹出大图 | title / caption / image |
| PICK_photo_2 | 同上 | |
| PICK_pc | 新标签打开链接 | url |
| PICK_book | 打开留言簿弹窗 | |
| PICK_radio | 播放 / 暂停背景音乐 | |
| PICK_door | Portal 占位弹窗 | text |
| PICK_lamp | 台灯开关 | |
| PICK_xxx | 兜底：显示信息卡片 | label / text |

### 碰撞体

| 命名 | 行为 |
| --- | --- |
| COL_bed | 一个立方体，运行时变成不可见碰撞盒 |
| COL_desk | 同上 |

做法：在床/桌子外面套一个立方体，缩放到刚好包住家具，命名为 `COL_bed`。
导出后网页里看不见，但会挡住玩家。

> 没有碰撞体也能跑，只是会被墙挡住（房间边界是硬限制），家具会穿过去。

### 自定义属性怎么加

选中物体 → 右侧 **Object Properties → Custom Properties → New**，输入 name / value。

- `title`（String）→ 弹窗标题
- `caption`（String）→ 弹窗描述
- `url`（String）→ 链接地址
- `label`（String）→ HUD 提示文字

glTF 导出器会把它们写进 `node.extras`，Three.js 读出来就是 `object.userData`。

---

## 5. 贴图

### 照片 / 插画贴到画框

1. 建一个 Plane（平面），放在画框前面 1~2mm，避免 Z-fighting。
2. 新建材质 → Base Color 接 Image Texture。
3. 图片建议 **1024 或 2048 像素宽**，转成 **webp**（体积小、支持透明）。
4. 图片文件放到 `public/images/`。

> 程序化房间里的画框是直接用 Canvas 画的插画，点开能看到大图 ——
> 这样没有素材时也有内容。

### 显示器屏幕

做一个稍小的 Plane 盖在屏幕前面，接一张截图或自己做的「桌面」图。
如果想让屏幕在夜里发光：材质里把 Emission 接同一张图，强度 1~2。

---

## 6. 性能

| 项 | 建议 |
| --- | --- |
| 总面数 | < 100,000（手机 < 50,000） |
| 单个物体 | 别用几万面的高模做小摆件 |
| 阴影 | 只给地面、墙、床、书桌开，小摆件关掉 |
| 贴图 | 1024 / 2048，转 webp |
| 材质 | 尽量复用，减少材质数量 |
| 灯光 | 有阴影的灯不要超过 4 个（本项目只有太阳投影） |

项目里 GLB 加载后会自动：

- 把小体积物体（< 0.004 m³）的 `castShadow` 关掉
- 给所有贴图设置正确的 sRGB 色彩空间
- 把 `COL_` 物体转成碰撞盒并隐藏

---

## 7. 常见问题

### 模型发黑
- 检查 Base Color 是不是纯黑
- 检查是不是用了 Emission 但强度为 0
- 网页端确认材质是 MeshStandardMaterial（glTF 默认就是）

### 模型躺着 / 上下颠倒
- 导出时确认 **+Y Up** 勾选
- 不要自己给模型加 -90° X 旋转再导出

### 模型巨大 / 极小
- 建模时单位是不是选了厘米
- 导出前 `Ctrl + A` 应用缩放

### 网页里模型位置偏了
- 房间原点必须在地板中心，地板在 y = 0
- 导出前把 3D 游标设到原点

### 点不到物体
- 名字是不是以 `PICK_` 开头
- 物体是不是被别的网格包住了（射线会先打到外壳）
- 射线最远 6.5m，站太远点不到（可改 `interactions.js` 里的 `raycaster.far`）

### 穿墙
- 房间边界有硬限制，不会穿出去
- 家具穿模 → 给家具加 `COL_` 碰撞盒

---

## 8. 一个最小可用的导出检查清单

- [ ] 单位是米，物体尺度正确
- [ ] 全选 → Ctrl + A → Rotation & Scale
- [ ] 删掉灯光和相机
- [ ] 地板在 y = 0，房间中心在原点
- [ ] 导出格式 .glb，+Y Up
- [ ] 取消勾选 Cameras / Punctual Lights
- [ ] 可选：勾选 Draco 压缩
- [ ] 交互物体以 PICK_ 开头，碰撞盒以 COL_ 开头
- [ ] 文件放到 `public/models/bedroom.glb`
