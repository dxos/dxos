import path from 'path';
import { defineTemplate } from '@dxos/plate';
import config from './config.t';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';

export default defineTemplate<typeof config>(async ({ input, outputDirectory }) => {
  const { name, monorepo, storybook } = input;
  const info = monorepo ? await getDxosRepoInfo() : null;
  const outputDirectoryRelativeToMonorepoRoot =
    monorepo && info?.isDxosMonorepo ? path.relative(info.repositoryRootPath, outputDirectory) : outputDirectory;
  const projectJson = {
    sourceRoot: `${outputDirectoryRelativeToMonorepoRoot}/src`,
    projectType: 'application',
    targets: {
      build: {
        executor: '@nrwl/js:tsc',
        options: {
          main: `packages/apps/${name}/src/index.ts`,
          outputPath: `packages/apps/${name}/dist`,
          transformers: ['@dxos/log-hook/transformer'],
          tsConfig: `packages/apps/${name}/tsconfig.json`
        },
        outputs: ['{options.outputPath}']
      },
      bundle: {
        executor: '@nrwl/vite:build',
        options: {
          outputPath: `packages/apps/${name}/out/${name}`
        },
        outputs: ['{options.outputPath}']
      },
      lint: {
        executor: '@nrwl/linter:eslint',
        options: {
          format: 'unix',
          lintFilePatterns: [`${outputDirectoryRelativeToMonorepoRoot}/**/*.{ts,js,tsx,jsx}`]
        },
        outputs: ['{options.outputFile}']
      },
      serve: {
        executor: '@nrwl/vite:dev-server',
        options: {
          buildTarget: `${name}:bundle`
        }
      },
      'serve-with-halo': {
        dependsOn: ['^build'],
        executor: 'nx:run-commands',
        options: {
          commands: [
            {
              command: 'nx serve halo-app'
            },
            {
              command: `nx serve ${name}`
            }
          ],
          parallel: true
        }
      },
      ...(storybook
        ? {
            storybook: {
              configurations: {
                ci: {
                  quiet: true
                }
              },
              executor: '@nrwl/storybook:storybook',
              options: {
                config: {
                  configFolder: 'packages/common/react-components/.storybook'
                },
                uiFramework: '@storybook/react'
              }
            }
          }
        : {})
    }
  };

  return monorepo ? JSON.stringify(projectJson, null, 2) : null;
});
