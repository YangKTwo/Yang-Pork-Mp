const ci = require('miniprogram-ci')
const path = require('path')

const projectRoot = path.join(__dirname, '..')

ci.packNpmManually({
  packageJsonPath: path.join(projectRoot, 'package.json'),
  miniprogramNpmDistDir: path.join(projectRoot, 'miniprogram/'),
})
  .then((result) => {
    console.log('packNpmManually:', result)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
