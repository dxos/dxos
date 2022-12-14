//
// Copyright 2022 DXOS.org
//

import { defineTemplate } from '@dxos/plate';
import config from './config.t';
import { getTsConfig, getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
// import rootTsconfig from '../../../../tsconfig.json';

// TODO(wittjosiah): Nx executor to execute in place.
export default defineTemplate<typeof config>(async ({ input }) => {
  const info = await getDxosRepoInfo();

  const rootTsConfig = info.isDxosMonorepo ? await getTsConfig(info.repositoryRootPath) : {};

  const compilerOptions = {
    emitDeclarationOnly: false,
    lib: ['DOM', 'ESNext'],
    outDir: 'dist',
    types: ['node']
  };

  const include = ['src'];

  const exclude = ['vite.config.ts'];

  const references = [
    {
      path: './tsconfig.node.json'
    }
  ];

  const tsconfig =
    input.monorepo && info.isDxosMonorepo
      ? {
          extends: '../../../../tsconfig.json',
          compilerOptions,
          include,
          exclude: [...exclude, '*.t.ts'],
          references: [
            ...references,
            {
              path: '../../../sdk/client'
            },
            {
              path: '../../../sdk/config'
            }
          ]
        }
      : {
          ...rootTsConfig,
          compilerOptions: {
            ...rootTsConfig.compilerOptions,
            ...compilerOptions
          },
          include,
          exclude: [...rootTsConfig.exclude, 'vite.config.ts'],
          references
        };

  return JSON.stringify(tsconfig, null, 2);
});
