import path from 'path';
import { defineTemplate } from '@dxos/plate';
import config from './config.t';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';

export default defineTemplate<typeof config>(async ({ input, outputDirectory }) => {
  const { monorepo } = input;
  const info = await getDxosRepoInfo();
  const outputDirectoryRelativeToMonorepoRoot =
    monorepo && info.isDxosMonorepo ? path.relative(info.repositoryRootPath, outputDirectory) : outputDirectory;
  const projectJson = {
    sourceRoot: `${outputDirectoryRelativeToMonorepoRoot}/src`,
    projectType: 'application',
    targets: {
      lint: {
        executor: '@nrwl/linter:eslint',
        options: {
          format: 'unix',
          lintFilePatterns: [`${outputDirectoryRelativeToMonorepoRoot}/**/*.{ts,js,tsx,jsx}`]
        },
        outputs: ['{options.outputFile}']
      }
    }
  };

  return monorepo ? JSON.stringify(projectJson, null, 2) : null;
});
