//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { withLogical, type WithLogicalClassGroups } from './withLogical';
import { semanticColors } from '../config';

const semanticColorClasses = Object.keys(semanticColors);

type AdditionalClassGroups = 'foreground' | 'surface' | 'separator' | WithLogicalClassGroups;

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
        foreground: semanticColorClasses.map((value) => `fg-${value}`),
        surface: semanticColorClasses.map((value) => `surface-${value}`),
        separator: semanticColorClasses.map((value) => `separator-${value}`),
      },
    },
  },
  withLogical,
);
