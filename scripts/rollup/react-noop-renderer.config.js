import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath,
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

// package name
const { name, module, peerDependencies } = getPackageJSON('react-noop-renderer')
// react-noop-renderer package path
const pkgPath = resolvePackagePath(name)
// react-noop-renderer dist path
const pkgDistPath = resolvePackagePath(name, true)

export default [
  // react-noop-renderer
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'ReactNoopRenderer',
        format: 'umd',
      },
    ],
    external: [...Object.keys(peerDependencies), 'scheduler'],
    plugins: [
      ...getBaseRollupPlugins({
        typescript: {
          exclude: ['./packages/react-dom/**/*'],
          tsconfigOverride: {
            compilerOptions: {
              paths: {
                hostConfig: [`./${name}/src/hostConfig.ts`],
              },
            },
          },
        },
      }),
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
          main: 'index.js',
          peerDependencies: {
            react: version,
          },
        }),
      }),
    ],
  },
]
