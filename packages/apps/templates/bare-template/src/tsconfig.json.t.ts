//
// Copyright 2022 DXOS.org
//

import template from './template.t';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import path from 'path';

export default template.define.text({
  content: async ({ input, outputDirectory }) => {
    const { monorepo } = input;
    const info = monorepo ? await getDxosRepoInfo() : null;

    // const rootTsConfig = monorepo && info?.isDxosMonorepo ? await getTsConfig(info.repositoryRootPath) : {};

    const compilerOptions = {
      emitDeclarationOnly: false,
      lib: ['DOM', 'ESNext'],
      module: 'ESNext',
      moduleResolution: 'node',
      outDir: 'dist',
      skipLibCheck: true,
      types: ['node', 'sharedworker'],
    };

    const include = ['src'];

    const exclude = ['vite.config.ts'];

    const references = [
      {
        path: './tsconfig.node.json',
      },
    ];

    const tsconfig =
      input.monorepo && info?.isDxosMonorepo
        ? {
            extends: path.relative(outputDirectory, info.repositoryRootPath + '/tsconfig.json'),
            compilerOptions,
            include,
            exclude: [...exclude],
            references: [
              ...references,
              {
                path: '../../../sdk/client',
              },
              {
                path: '../../../sdk/config',
              },
            ],
          }
        : {
            compilerOptions: {
              esModuleInterop: true,
              jsx: 'react',
              ...compilerOptions,
            },
            include,
            exclude: ['node_modules', 'dist', 'vite.config.ts'],
            references,
          };

    return JSON.stringify(tsconfig, null, 2);
  },
});
