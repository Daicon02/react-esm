import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath,
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

// package name
const { name, module, peerDependencies } = getPackageJSON('react-dom')
// react-dom package path
const pkgPath = resolvePackagePath(name)
// react-dom dist path
const pkgDistPath = resolvePackagePath(name, true)

export default [
  // react-dom
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'ReactDOM',
        format: 'esm',
      },
      {
        file: `${pkgDistPath}/client.js`,
        name: 'client',
        format: 'esm',
      },
    ],
    external: [...Object.keys(peerDependencies), 'scheduler'],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          hostConfig: `${pkgPath}/src/hostConfig.ts`,
        },
      }),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          module: 'index.js',
          peerDependencies: {
            react: version,
          },
        }),
      }),
    ],
  },
  // react-test-utils
  {
    input: `${pkgPath}/test-utils.ts`,
    output: [
      {
        file: `${pkgDistPath}/test-utils.js`,
        name: 'testUtils',
        format: 'esm',
      },
    ],
    external: ['react', 'react-dom', 'scheduler'],
    plugins: getBaseRollupPlugins(),
  },
]
