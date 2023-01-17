//
// Copyright 2022 DXOS.org
//

import { defineTemplate } from '@dxos/plate';
import config from './config.t';
import { getTsConfig, getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import path from 'path';

// TODO(wittjosiah): Nx executor to execute in place.
export default defineTemplate<typeof config>(async ({ input, outputDirectory }) => {
  const { monorepo } = input;
  const info = monorepo ? await getDxosRepoInfo() : null;

  const rootTsConfig = monorepo && info?.isDxosMonorepo ? await getTsConfig(info.repositoryRootPath) : {};

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
    input.monorepo && info?.isDxosMonorepo
      ? {
          extends: path.relative(outputDirectory, info.repositoryRootPath + '/tsconfig.json'),
          compilerOptions,
          include,
          exclude: [...exclude],
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
          compilerOptions: {
            esModuleInterop: true,
            jsx: 'react',
            ...compilerOptions
          },
          include,
          exclude: ['node_modules', 'dist', 'vite.config.ts'],
          references
        };

  return JSON.stringify(tsconfig, null, 2);
});
