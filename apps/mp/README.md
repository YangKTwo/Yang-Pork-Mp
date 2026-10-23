# 微信小程序（`apps/mp`）

原生微信小程序 + TypeScript，UI 使用 [@vant/weapp](https://github.com/youzan/vant-weapp)。

## 依赖与 npm 构建

```bash
cd apps/mp
npm install
npm run build:npm   # 或微信开发者工具：工具 → 构建 npm
```

构建产物输出到 `miniprogram/miniprogram_npm/`。仓库已提交当前构建结果；升级 `@vant/weapp` 后请重新执行上述命令。

`project.config.json` 已配置 `packNpmManually` 与 `packNpmRelationList`（`miniprogramRoot=miniprogram/`）。

## 开发者工具

1. 打开目录 **`apps/mp`**（勿只打开 `miniprogram/` 子目录）。
2. 首次拉代码或 `npm install` 后执行 **构建 npm**（见上）。
3. 主题与 P0 自定义块说明见 [docs/design/11_vant_weapp_design_align.md](../../docs/design/11_vant_weapp_design_align.md)。

## 类型检查

```bash
npm run tsc
```
