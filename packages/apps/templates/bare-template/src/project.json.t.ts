import path from 'path';
import template from './template.t';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';

export default template.define.text({
  content: async ({ input, outputDirectory }) => {
    const { name, monorepo, storybook } = input;
    const info = monorepo ? await getDxosRepoInfo() : null;
    const outputDirectoryRelativeToMonorepoRoot =
      monorepo && info?.isDxosMonorepo ? path.relative(info.repositoryRootPath, outputDirectory) : outputDirectory;
    const projectJson = {
      sourceRoot: `${outputDirectoryRelativeToMonorepoRoot}/src`,
      projectType: 'application',
      targets: {
        build: {
          executor: '@nx/js:tsc',
          options: {
            main: `packages/apps/${name}/src/index.ts`,
            outputPath: `packages/apps/${name}/dist`,
            transformers: ['@dxos/log-hook/transformer'],
            tsConfig: `packages/apps/${name}/tsconfig.json`,
          },
          outputs: ['{options.outputPath}'],
        },
        bundle: {
          executor: '@nx/vite:build',
          options: {
            outputPath: `packages/apps/${name}/out/${name}`,
          },
          outputs: ['{options.outputPath}'],
        },
        lint: {
          executor: '@nx/linter:eslint',
          options: {
            format: 'unix',
            lintFilePatterns: [`${outputDirectoryRelativeToMonorepoRoot}/**/*.{ts,js}?(x)`],
          },
          outputs: ['{options.outputFile}'],
        },
        serve: {
          executor: '@nx/vite:dev-server',
          options: {
            buildTarget: `${name}:bundle`,
          },
        },
        'serve-with-vault': {
          dependsOn: ['^build'],
          executor: 'nx:run-commands',
          options: {
            commands: [
              {
                command: 'nx serve halo-app',
              },
              {
                command: `nx serve ${name}`,
              },
            ],
            parallel: true,
          },
        },
        ...(storybook
          ? {
              storybook: {
                configurations: {
                  ci: {
                    quiet: true,
                  },
                },
                executor: '@nx/storybook:storybook',
                options: {
                  config: {
                    configFolder: 'packages/ui/react-ui/.storybook',
                  },
                  uiFramework: '@storybook/react',
                },
              },
            }
          : {}),
      },
    };

    return monorepo && JSON.stringify(projectJson, null, 2);
  },
});
