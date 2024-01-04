//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { withLogical } from './withLogical';

export const mx = extendTailwindMerge(
  {
    classGroups: {
      fontFamily: ['font-body', 'font-mono'],
      fontWeight: [
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
    },
  },
  withLogical,
);
