# 🐱 猫猫导航 (Mao Nav)
一个简洁的个人导航站：前台展示分类与站点，后台可在线编辑并把数据与图片保存到服务器本地（不依赖 GitHub/Vercel/Cloudflare）。

## ✨ 特性
- 🎨 现代化 UI + 响应式布局（Vue 3 + Vite）
- 📁 分类/站点管理（管理后台）
- 💾 本地落盘保存（不依赖 GitHub/Vercel/Cloudflare）
- 🖼️ 支持上传 Logo、自动抓取并保存站点图标（保存到服务器本地）

## 🧱 技术栈
- 前端：Vue 3、Vue Router、Pinia、Vite
- 后端：Node.js + Express（提供 `/api` 读写与静态资源托管）
- 配置：dotenv（读取 `.env`）、可选 `server.config.json`

## 🚀 本地开发
1. 安装依赖
```bash
npm install
```

2. 启动本地保存服务（API）
```bash
npm run server
```

3. 启动前端开发服务器
```bash
npm run dev
```

4. 访问
- 前台：Vite 输出的地址（默认 5173/5174）
- 管理后台：`/admin`

## 🔑 管理密码
后端写入接口需要管理员密码（用于保存导航数据、上传 Logo/站点图标）。推荐只配置后端密码即可。

在项目根目录创建 `.env`（不要提交到仓库）：
```bash
ADMIN_PASSWORD=your_admin_password_here
```
管理后台登录会通过后端接口校验该密码。

## ⚙️ 端口配置（配置文件）
服务器支持从配置文件读取端口与管理员密码（也可继续用环境变量覆盖）：
- 复制 `server.config.example.json` 为 `server.config.json`
- 修改内容：
```json
{
  "port": 8787,
  "adminPassword": "your_admin_password_here"
}
```
优先级：环境变量 `PORT/ADMIN_PASSWORD` > `server.config.json`

## 📦 服务器部署（自建服务器）
1. 构建前端
```bash
npm run build
```

2. 启动服务（同时提供静态页面与 API）
```bash
npm run server
```

默认端口：`8787`（可通过 `PORT` 环境变量修改）。

## 💾 数据与文件存储
- 导航数据：`data/navigation.json`
- 站点图标：`data/public/sitelogo/`
- 站点 Logo：`data/public/logo.png`（同时作为浏览器标签页图标 favicon）

## 📁 目录结构与依赖关系
- server/
  - `index.js`：Express 服务，提供 `/api/*`，并托管 `dist/` 与 `data/public/`
  - `seed_navigation.json`：首次启动且 `data/navigation.json` 不存在时的初始化数据
- src/
  - apis/
    - `useLocalAPI.js`：前端访问后端 `/api` 的封装（登录校验、读写导航、上传文件）
    - `useNavigation.js`：前台页面使用的导航数据获取与本地缓存
  - composables/
    - `useDialog.js`：管理后台通用弹框状态与方法
  - components/admin/：管理后台组件（分类/站点/系统设置）
  - router/：前端路由（`/` 前台，`/admin` 管理后台）
  - views/：页面视图（前台与后台入口）
  - assets/：前端静态资源（搜索引擎图标等）
- data/
  - 运行时数据目录（默认不提交到仓库），存放导航 JSON 与上传文件
- dist/
  - 前端构建产物（`npm run build` 生成），由后端在生产环境托管

直接依赖关系（简版）：
- 前台 [views/NavHomeView.vue] → [apis/useNavigation.js] → [apis/useLocalAPI.js] → 后端 `/api/navigation`
- 后台 [views/AdminView.vue] / [components/admin/*] → [apis/useLocalAPI.js] → 后端 `/api/navigation` 与 `/api/file`
- 后端 `server/index.js` → 写入 `data/` 并对外提供静态资源 `/logo.png`、`/sitelogo/*`

## 🧭 常见问题
### npm run dev 报 ENOENT 找不到 package.json
请确认当前目录是项目目录 `mao_nav`，而不是上层目录：
```bash
cd C:\Users\19784\Documents\CodeList\web\mao_nav
npm run dev
```
宝塔/PM2 启动 Node 项目时也要把“运行目录/工作目录”设置到 `.../mao_nav`。

## 🛠️ 常用命令
```bash
npm run dev
npm run server
npm run build
npm run preview
npm run lint
```

## 📄 许可证
MIT - 查看 [LICENSE](LICENSE)
