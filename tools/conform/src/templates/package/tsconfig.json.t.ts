import { defineTemplate, text } from '@dxos/plate';
import path from 'path';
import config from './config.t';

export default defineTemplate(
  ({ outputDirectory }) => {
    const rootTsConfig = path.resolve(__dirname, '../../../../../../tsconfig.json');
    const tsconfigJson = {
      extends: path.relative(outputDirectory, rootTsConfig),
      compilerOptions: {
        lib: ['DOM', 'ESNext'],
        outDir: 'dist',
        types: ['node'],
        emitDeclarationOnly: false
      },
      include: ['src']
    };
    return JSON.stringify(tsconfigJson, null, 2);
  },
  { config }
);