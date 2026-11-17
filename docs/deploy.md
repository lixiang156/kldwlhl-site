# 部署：把小屋挂到你的个人网页上

下面按「最省事 → 最灵活」排。

---

## 方案 A：Cloudflare Pages（推荐，自带 KV）

### 1. 构建产物

```bash
npm run build
```

产物在 `dist/`。`functions/` 目录会被 Cloudflare 自动识别成 Pages Functions。

### 2. 建 KV 命名空间

```bash
npx wrangler login
npx wrangler kv namespace create BEDROOM_KV
```

把输出的 id 填进 `wrangler.toml` 的 `[[kv_namespaces]]`（文件里有注释模板）。

### 3. 部署

```bash
npx wrangler pages deploy dist --project-name=anime-bedroom
```

或者在 Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接 Git 仓库：

| 配置项 | 值 |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 或 22 |

然后在 **Settings → Functions → KV namespace bindings** 里添加：

| Variable name | KV namespace |
| --- | --- |
| `BEDROOM_KV` | 你刚建的那个 |

### 4. 验证

打开 `/api/messages` 应该返回 `{"messages":[]}`，
在留言簿里写一条，刷新还在 → 成功。

### 5. 挂到个人网页

- 如果是子域名（如 `room.yourdomain.com`）：加 CNAME 指向 `xxx.pages.dev`。
- 如果想挂在 `yourdomain.com/room/`：在 `vite.config.js` 里把 `base` 改成 `'/room/'`，重新构建部署，然后在主站用 Nginx / Vercel rewrite 转发。
- 最简单的：主站放一个 iframe 或一张跳转卡片。

---

## 方案 B：Vercel / Netlify（静态托管，无 KV）

前端完全一样，但没有 `/api`，留言会退回「本地模式」。
你可以把 API 单独部署到 Cloudflare Workers，然后：

```env
VITE_API_BASE=https://your-worker.workers.dev/api
```

重新构建即可。

---

## 方案 C：Supabase 做留言 / 打卡

### 1. 建表

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  text text not null,
  mood text default '✨',
  created_at timestamptz default now()
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;
alter table checkins enable row level security;

create policy "anyone can read messages" on messages for select using (true);
create policy "anyone can insert messages" on messages for insert with check (true);
create policy "anyone can read checkins" on checkins for select using (true);
create policy "anyone can insert checkins" on checkins for insert with check (true);
```

### 2. 前端改造

`src/services/api.js` 里的 `request()` 换成 Supabase 客户端即可，接口形状保持：

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// 读
const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(120)
// 写
await supabase.from('messages').insert({ name, text, mood })
```

把 `createdAt` 映射成 `created_at` 就完事了，UI 不用改。

> 注意：anon key 会暴露在前端，务必开 RLS，不要给 delete / update 权限。

---

## 方案 D：纯前端 + GitHub Issues

不想搞后端的话，可以用 GitHub Issues 当留言板（配合 fine-grained token）。
适合个人小屋，但交互体验会差一些。

---

## 常见部署问题

| 现象 | 原因 |
| --- | --- |
| 模型 404 | `public/models/bedroom.glb` 没提交，或文件名大小写不对 |
| 白屏、控制台 CORS | 部署在子路径但 `base` 没改对 |
| 留言一直是「本地模式」 | `/api/messages` 返回 404 或 500，检查 KV 绑定变量名是不是 `BEDROOM_KV` |
| 手机上转不了视角 | PointerLock 移动端不支持，属于预期 |
| 首屏很慢 | GLB 太大，开 Draco + 压贴图 |
