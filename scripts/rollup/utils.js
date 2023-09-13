import path from 'path'
import fse from 'fs-extra'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const pkgPath = path.resolve(__dirname, '../../packages')
const distPath = path.resolve(__dirname, '../../dist/node_modules')

export function resolvePackagePath(pkgName, isDist = false) {
  // dist path
  if (isDist) {
    return `${distPath}/${pkgName}`
  }
  return `${pkgPath}/${pkgName}`
}

export function getPackageJSON(pkgName) {
  // package path
  const path = `${resolvePackagePath(pkgName)}/package.json`
  const str = fse.readFileSync(path, { encoding: 'utf-8' })
  return JSON.parse(str)
}

export function getBaseRollupPlugins({
  alias = {
    __DEV__: true,
  },
  typescript = {},
} = {}) {
  return [replace(alias), cjs(), ts(typescript)]
}
