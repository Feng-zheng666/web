# 节点优选系统 - Web界面

一个自动化的节点优选系统，具有赛博朋克风格的Web界面。

## 功能特性

- ✅ 自动化处理：GitHub Actions定时运行，无需人工干预
- ✅ 节点优选：自动剔除失效节点，仅保留延迟达标的节点
- ✅ 地理分析：自动查询节点IP归属地，按国家/地区进行归类和排序
- ✅ 环境透明：显示测试环境（GitHub服务器）的真实IP和地理位置
- ✅ 高科技UI：赛博朋克风格界面，支持一键复制，适配手机/电脑使用

## 项目结构

```
├── process.py              # 后端数据处理脚本
├── .github/workflows/update.yml  # GitHub Actions自动化工作流
├── index.html             # 前端主页面
├── style.css              # 赛博朋克样式表
├── script.js              # 前端交互脚本
├── nodes.json             # 节点数据文件（自动生成）
├── requirements.txt       # Python依赖
└── 部署配置文件：
    ├── netlify.toml       # Netlify部署配置
    ├── vercel.json        # Vercel部署配置
    ├── wrangler.jsonc     # Cloudflare Pages配置
    └── _worker.js         # Cloudflare Worker脚本
```

## 部署方式

### 1. GitHub Pages（推荐）
1. 在GitHub仓库设置中启用GitHub Pages
2. 配置 `SUBSCRIPTION_LINK` secret（Base64编码的订阅链接）
3. 工作流将自动每6小时更新节点数据

### 2. Netlify
- 自动检测 `netlify.toml` 配置
- 部署为静态站点

### 3. Vercel
- 自动检测 `vercel.json` 配置
- 部署为静态站点

### 4. Cloudflare Pages
- 自动检测 `wrangler.jsonc` 配置
- 使用Worker处理路由

## 本地运行

1. 安装Python依赖：
   ```bash
   pip install -r requirements.txt
   ```

2. 设置环境变量：
   ```bash
   export SUBSCRIPTION_LINK="你的Base64编码订阅链接"
   ```

3. 运行处理脚本：
   ```bash
   python process.py
   ```

4. 在浏览器中打开 `index.html`

## 配置说明

### GitHub Secrets
- `SUBSCRIPTION_LINK`: Base64编码的订阅链接

### 自定义样式
修改 `style.css` 中的CSS变量来调整颜色主题：
```css
:root {
  --cyber-primary: #00f3ff;
  --cyber-secondary: #ff00ff;
  --cyber-bg: #0a0a14;
}
```

## 许可证

MIT
