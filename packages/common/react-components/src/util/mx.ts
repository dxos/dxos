//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { withLogical } from './withLogical';

export const mx = extendTailwindMerge(
  {
    classGroups: {
      fontFamily: ['font-body', 'font-display', 'font-mono'],
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
        // OS weights
        'font-system-thin',
        'font-system-extralight',
        'font-system-light',
        'font-system-normal',
        'font-system-medium',
        'font-system-semibold',
        'font-system-bold',
        'font-system-extrabold',
        'font-system-black',
        // Arbitrary numbers
        validators.isArbitraryNumber
      ]
    }
  },
  withLogical
);
