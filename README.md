# 🐱 猫猫导航 (Mao Nav) v1.3.0
一个简洁的个人导航站：前台展示分类与站点，后台可在线编辑并把数据与图片保存到服务器本地（不依赖 GitHub/Vercel/Cloudflare）。

## ✨ 特性
- 🎨 现代化 UI + 响应式布局（Vue 3 + Vite）
- 📁 分类/站点管理（管理后台）
- 💾 本地落盘保存（不依赖 GitHub/Vercel/Cloudflare）
- 🖼️ 支持上传 Logo、自动抓取并保存站点图标（保存到服务器本地）
- 🎵 内置音乐播放器（支持网易云/QQ音乐搜索与播放）
- 🛠️ **新增网页安装向导**：无需手动改配置文件，访问网页即可配置管理员密码与端口

## 🧱 技术栈
- 前端：Vue 3、Vue Router、Pinia、Vite
- 后端：Node.js + Express（提供 `/api` 读写与静态资源托管）
- 配置：自动生成 `server.config.json` 或使用 `.env`

## 🚀 快速开始（本地开发）
1. 安装依赖
```bash
npm install
```

2. 启动服务（API + 前端托管）
```bash
npm run server
```

3. 访问安装向导
浏览器打开 `http://localhost:8787`，根据提示设置管理员密码。

4. 开发模式（可选，仅修改前端时需要）
```bash
npm run dev
```

## 📦 服务器部署（宝塔面板）

### 1. 准备工作
- 服务器环境：Node.js 18+
- 宝塔面板（推荐）或手动安装 PM2

### 2. 部署步骤
1. **上传代码**：将项目代码（或打包好的 `release.zip`）上传到服务器目录（如 `/www/server/nodejs/mao_nav`）。
2. **安装依赖**：
   ```bash
   cd /www/server/nodejs/mao_nav
   npm install --production
   ```
3. **启动服务**：
   - 方式一：宝塔“网站-Node项目”中添加本项目，启动命令选 `npm run server` 或指向 `ecosystem.config.js`。
   - 方式二：手动运行 `pm2 start ecosystem.config.js`。

### 3. 初始化配置
1. 确保服务器防火墙放行 **8787** 端口（仅首次安装需要）。
2. 浏览器访问 `http://服务器IP:8787`。
3. 填写管理员密码、端口（默认 8787）和域名。
4. 点击“开始安装”，系统会自动生成配置文件。

### 4. 配置 Nginx 反向代理（推荐）
为了安全和绑定域名，建议使用 Nginx 反向代理。

在宝塔面板的【网站】-【设置】-【配置文件】中，将以下内容替换进去（或修改相应部分）：

```nginx
server {
    listen 80;
    server_name www.mojian.uno; # 替换为你的域名

    # 宝塔的站点根目录这里可以留着（不用于业务），但建议保留以便某些插件/验证使用
    root /www/wwwroot/www.mojian.uno;
    index index.html index.htm default.htm default.html;

    # 宝塔扩展配置（如果你没用到可保留）
    include /www/server/panel/vhost/nginx/extension/www.mojian.uno/*.conf;

    #CERT-APPLY-CHECK--START
    # 用于SSL证书申请时的文件验证相关配置 -- 请勿删除并保持这段设置在优先级高的位置
    include /www/server/panel/vhost/nginx/well-known/www.mojian.uno.conf;
    #CERT-APPLY-CHECK--END

    # -------------------------
    # 全站反向代理到 Node (PM2)
    # -------------------------
    location / {
        proxy_pass http://127.0.0.1:8787;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（很重要：前端热更新/实时功能/某些框架会用到）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 适当调大超时，避免接口耗时导致 504
        proxy_read_timeout 300;
        proxy_send_timeout 300;

        # 可选：上传大文件时需要
        client_max_body_size 100m;
    }

    # 禁止访问的敏感文件（保留）
    location ~* (\.user.ini|\.htaccess|\.htpasswd|\.env.*|\.project|\.bashrc|\.bash_profile|\.bash_logout|\.DS_Store|\.gitignore|\.gitattributes|LICENSE|README\.md|CLAUDE\.md|CHANGELOG\.md|CHANGELOG|CONTRIBUTING\.md|TODO\.md|FAQ\.md|composer\.json|composer\.lock|package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|\.\w+~|\.swp|\.swo|\.bak(up)?|\.old|\.tmp|\.temp|\.log|\.sql(\.gz)?|docker-compose\.yml|docker\.env|Dockerfile|\.csproj|\.sln|Cargo\.toml|Cargo\.lock|go\.mod|go\.sum|phpunit\.xml|pom\.xml|build\.gradl|pyproject\.toml|requirements\.txt|application(-\w+)?\.(ya?ml|properties))$
    {
        return 404;
    }

    # 禁止访问的敏感目录（保留）
    location ~* /(\.git|\.svn|\.bzr|\.vscode|\.claude|\.idea|\.ssh|\.github|\.npm|\.yarn|\.pnpm|\.cache|\.husky|\.turbo|\.next|\.nuxt|node_modules|runtime)/ {
        return 404;
    }

    # 一键申请SSL证书验证目录相关设置（保留）
    location ~ \.well-known{
        allow all;
    }

    # 禁止在证书验证目录放入敏感文件（保留）
    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    access_log  /www/wwwlogs/www.mojian.uno.log;
    error_log   /www/wwwlogs/www.mojian.uno.error.log;
}
```

## � 数据与文件存储
- 导航数据：`data/navigation.json`
- 站点图标：`data/public/sitelogo/`
- 站点 Logo：`data/public/logo.png`
- 音乐列表：`data/playlist.json`

## 📁 目录结构
- `server/`：Express 服务端代码
- `src/`：Vue 前端源码
- `data/`：运行时数据（建议定期备份）
- `dist/`：前端构建产物（由后端托管）
- `deploy/`：部署相关配置备份

## 🔑 管理后台
- 访问地址：`/admin`
- 默认密码：安装时设置的密码（或在 `server.config.json` 中修改）

## 📄 许可证
MIT - 查看 [LICENSE](LICENSE)
