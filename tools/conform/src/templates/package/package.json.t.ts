import { defineTemplate } from '@dxos/plate';
import { PackageJson } from 'types-package-json';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { name } = input;
    const packageJson: PackageJson = {
      name,
      version: '0.1.0',
      main: 'dist/src/index.js',
      scripts: {
        build: 'tsc'
      },
      devDependencies: {
        typescript: '^4.8.4'
      }
    };
    return JSON.stringify(packageJson, null, 2);
  },
  { config }
);
