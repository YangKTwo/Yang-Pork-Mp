const ci = require('miniprogram-ci')
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const miniprogramNpmDistDir = path.join(projectRoot, 'miniprogram/')
const vantPkg = path.join(projectRoot, 'node_modules/@vant/weapp')
const submitBarOut = path.join(
  miniprogramNpmDistDir,
  'miniprogram_npm/@vant/weapp/submit-bar/index.js',
)

function fail(msg) {
  console.error(`\n[build:npm] ${msg}`)
  console.error(
    '\n请在仓库根目录下的 apps/mp 执行：\n  npm install\n  npm run build:npm\n',
  )
  console.error(
    '微信开发者工具请打开 **apps/mp**（勿只打开 miniprogram/），然后：工具 → 构建 npm → 清缓存 → 重新编译。\n',
  )
  process.exit(1)
}

if (!fs.existsSync(packageJsonPath)) {
  fail(`未找到 ${packageJsonPath}`)
}
if (!fs.existsSync(vantPkg)) {
  fail('未找到 node_modules/@vant/weapp，请先执行 npm install')
}

ci.packNpmManually({
  packageJsonPath,
  miniprogramNpmDistDir,
})
  .then((result) => {
    console.log('packNpmManually:', result)
    if (!fs.existsSync(submitBarOut)) {
      console.warn(
        '[build:npm] 警告：未生成 submit-bar；若首页底栏报错，请确认 @vant/weapp 版本后重试。',
      )
    } else {
      console.log('[build:npm] 已生成 miniprogram/miniprogram_npm/@vant/weapp/')
    }
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
