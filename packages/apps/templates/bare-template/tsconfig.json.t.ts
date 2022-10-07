//
// Copyright 2022 DXOS.org
//

import { TemplateFunction } from '@dxos/plate';

import rootTsconfig from '../../../tsconfig.json';

export type Input = {
  monorepo?: boolean
}

// TODO(wittjosiah): Nx executor to execute in place.
const template: TemplateFunction<Input> = ({ input }) => {
  const compilerOptions = {
    lib: [
      'DOM',
      'ESNext'
    ],
    outDir: 'dist',
    types: [
      'node'
    ]
  };

  const include = [
    'src',
    'playwright'
  ];

  const exclude = [
    'vite.config.ts'
  ];

  const references = [
    {
      path: './tsconfig.node.json'
    }
  ];

  const tsconfig = input.monorepo ? {
    extends: '../../../tsconfig.json',
    compilerOptions,
    include,
    exclude: [
      ...exclude,
      '*.t.ts'
    ],
    references: [
      ...references,
      {
        path: './tsconfig.plate.json'
      },
      {
        path: '../../../packages/sdk/client'
      },
      {
        path: '../../../packages/sdk/config'
      }
    ]
  } : {
    ...rootTsconfig,
    compilerOptions,
    include,
    exclude,
    references
  };

  return JSON.stringify(tsconfig, null, 2);
};

export default template;
