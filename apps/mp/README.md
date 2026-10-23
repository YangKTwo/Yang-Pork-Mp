# 微信小程序（`apps/mp`）

原生微信小程序 + TypeScript，UI 使用 [@vant/weapp](https://github.com/youzan/vant-weapp)。

## Windows / 本地最短流程

1. **用微信开发者工具打开目录 `apps/mp`**（项目根含 `project.config.json` 与 `package.json`）。不要只打开子目录 `miniprogram/`。
2. 在终端进入 `apps/mp`：
   ```bash
   cd apps/mp
   npm install
   npm run build:npm
   ```
3. 开发者工具：**工具 → 构建 npm**（`packNpmManually: true` 时仍需要，与 `npm run build:npm` 二选一或各执行一次以同步产物）。
4. **清缓存 → 重新编译**（模拟器仍报 `NPM packages not found` 或 `Component not found` 时必做）。

`van-submit-bar` 仅在商品首页（加购底栏）按页注册，不在 `app.json` 全局注册，避免其它页面（如完善资料）解析该组件路径。

## 依赖与 npm 构建

```bash
cd apps/mp
npm install
npm run build:npm   # 或仅使用微信开发者工具：工具 → 构建 npm
```

构建产物输出到 `miniprogram/miniprogram_npm/`。仓库已提交当前构建结果；升级 `@vant/weapp` 后请重新执行上述命令。

`project.config.json` 配置说明：

- `miniprogramRoot`: `miniprogram/`
- `packNpmManually`: `true`
- `packNpmRelationList`: `package.json`（项目根 `apps/mp`）→ `miniprogramNpmDistDir` 为 `./miniprogram/`

## 开发者工具

1. 打开目录 **`apps/mp`**（勿只打开 `miniprogram/` 子目录）。
2. 首次拉代码或 `npm install` 后执行 **构建 npm**（见上）。
3. 主题与 P0 自定义块说明见 [docs/design/11_vant_weapp_design_align.md](../../docs/design/11_vant_weapp_design_align.md)。

## 类型检查

```bash
npm run tsc
```
