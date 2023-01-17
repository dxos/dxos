import { defineTemplate, text } from '@dxos/plate';
import path from 'path';
import config from './config.t';

export default defineTemplate(
  ({ outputDirectory }) => {
    const relative = (...s: string[]) => path.relative(process.cwd(), path.resolve(outputDirectory, ...s));
    const projectJson = {
      sourceRoot: relative('src'),
      projectType: 'library',
      targets: {
        build: {
          executor: '@nrwl/js:tsc',
          options: {
            main: relative('src', 'index.ts'),
            outputPath: relative('dist'),
            tsConfig: relative('tsconfig.json')
          },
          outputs: ['{options.outputPath}']
        },
        lint: {
          executor: '@nrwl/linter:eslint',
          options: {
            format: 'unix',
            lintFilePatterns: [relative('src/**/*.{ts,js,tsx,jsx}')]
          },
          outputs: ['{options.outputFile}']
        }
      }
    };
    return JSON.stringify(projectJson, null, 2);
  },
  { config }
);
