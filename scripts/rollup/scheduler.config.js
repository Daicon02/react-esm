import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath,
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'

// package name
const { name, module } = getPackageJSON('scheduler')
// scheduler package path
const pkgPath = resolvePackagePath(name)
// scheduler dist path
const pkgDistPath = resolvePackagePath(name, true)

export default [
  // scheduler
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'Scheduler',
        format: 'esm',
      },
    ],

    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          module: 'index.js',
        }),
      }),
    ],
  },
]
