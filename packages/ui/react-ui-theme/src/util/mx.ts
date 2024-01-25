//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { withLogical } from './withLogical';
import { semanticColors } from '../config/colors';

const semanticColorClasses = Object.keys(semanticColors);

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
      foreground: semanticColorClasses.map((value) => `fg-${value}`),
      surface: semanticColorClasses.map((value) => `surface-${value}`),
      separator: semanticColorClasses.map((value) => `separator-${value}`),
    },
  },
  withLogical,
);
