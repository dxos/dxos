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

  const tsconfig = input.monorepo ? {
    extends: '../../../tsconfig.json',
    compilerOptions,
    include,
    references: [
      {
        'path': '../../../packages/sdk/client'
      },
      {
        'path': '../../../packages/sdk/config'
      },
      {
        'path': '../../../packages/sdk/react-client'
      },
      {
        'path': '../../../packages/sdk/react-client-testing'
      },
      {
        'path': '../../../packages/sdk/react-components'
      },
      {
        'path': '../../../packages/sdk/react-toolkit'
      }
    ]
  } : {
    ...rootTsconfig,
    compilerOptions,
    include
  };

  return JSON.stringify(tsconfig, null, 2);
};

export default template;
