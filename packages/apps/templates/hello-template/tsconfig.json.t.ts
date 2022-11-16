//
// Copyright 2022 DXOS.org
//

import { TemplateFunction } from '@dxos/plate';

import rootTsconfig from '../../../../tsconfig.json';

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
    'src'
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
    extends: '../../../../tsconfig.json',
    compilerOptions,
    include,
    exclude: [
      ...exclude,
      '*.t.ts'
    ],
    references: [
      ...references,
      {
        path: '../../../experimental/react-client-testing'
      },
      {
        path: '../../../deprecated/react-components'
      },
      {
        path: '../../../deprecated/react-toolkit'
      },
      {
        path: '../../../sdk/client'
      },
      {
        path: '../../../sdk/config'
      },
      {
        path: '../../../sdk/react-client'
      },
      {
        path: '../../../sdk/vite-plugin'
      },
      {
        path: './tsconfig.plate.json'
      }
    ]
  } : {
    ...rootTsconfig,
    compilerOptions: {
      ...rootTsconfig,
      ...compilerOptions
    },
    include,
    exclude: [
      ...rootTsconfig.exclude,
      'vite.config.ts'
    ],
    references
  };

  return JSON.stringify(tsconfig, null, 2);
};

export default template;
