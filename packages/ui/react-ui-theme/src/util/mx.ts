//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { type WithLogicalClassGroups, withLogical } from './withLogical';

type AdditionalClassGroups = 'density' | WithLogicalClassGroups;

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
      },
    },
  },
  withLogical,
);
