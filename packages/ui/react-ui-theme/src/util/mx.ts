//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { type WithLogicalClassGroups, withLogical } from './withLogical';

type AdditionalClassGroups = 'density' | 'dx-focus-ring' | WithLogicalClassGroups;

export const mx = extendTailwindMerge<AdditionalClassGroups>(
  {
    extend: {
      classGroups: {
        'font-family': ['font-body', 'font-mono'],
        'font-weight': [
          // App weights
          'font-thin',
          'font-extralight',
          'font-light',
          'font-normal',
          'font-medium',
          'font-semibold',
          'font-bold',
          'font-extrabold',
          'font-black',
          // Arbitrary numbers
          validators.isArbitraryNumber,
        ],
        density: ['density-fine', 'density-coarse'],
        'dx-focus-ring': [
          'dx-focus-ring',
          'dx-focus-ring-inset',
          'dx-focus-ring-always',
          'dx-focus-ring-inset-always',
          'dx-focus-ring-group',
          'dx-focus-ring-group-x',
          'dx-focus-ring-group-y',
          'dx-focus-ring-group-always',
          'dx-focus-ring-group-x-always',
          'dx-focus-ring-group-y-always',
          'dx-focus-ring-inset-over-all',
          'dx-focus-ring-inset-over-all-always',
          'dx-focus-ring-main',
          'dx-focus-ring-main-always',
        ],
      },
    },
  },
  withLogical,
);
