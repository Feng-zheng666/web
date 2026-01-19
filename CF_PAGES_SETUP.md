# Cloudflare Pages 部署配置说明

## 问题
Cloudflare Pages 错误："Missing entry-point to Worker script or to assets directory"

## 原因
Cloudflare Pages 检测到项目可能包含 Worker 代码，但缺少必要的配置。

## 解决方案

### 1. Cloudflare Pages 仪表板设置
在 Cloudflare Pages 项目设置中：
- **构建命令**: 留空或设置为 `echo 'Static site'`
- **构建输出目录**: `.` (根目录)
- **环境变量**: 无需特殊配置

### 2. 项目文件配置
本项目已包含以下配置文件：
- `wrangler.jsonc`: 配置为静态资产站点
- `package.json`: 包含构建脚本
- 已重命名 `functions` 目录为 `_functions` 以禁用自动 Functions 检测

### 3. 重新部署
1. 在 Cloudflare Pages 仪表板中，转到项目设置
2. 确保构建配置正确
3. 触发重新部署

### 4. 替代方案：使用 GitHub Pages
如果 Cloudflare Pages 仍有问题，建议使用 GitHub Pages：
- 项目已完全配置 GitHub Actions 自动部署
- 在 GitHub 仓库设置中启用 Pages
- 选择部署源为 "GitHub Actions"

## 文件说明
- `wrangler.jsonc`: Cloudflare Pages 静态站点配置
- `package.json`: Node.js 项目配置
- `_functions/`: 原 functions 目录（已重命名，Cloudflare Pages 不会自动检测）
- `.github/workflows/update.yml`: GitHub Actions 工作流，用于自动更新和部署到 GitHub Pages
