//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge } from 'tailwind-merge';

export const mx = extendTailwindMerge({
  classGroups: {
    fontFamily: ['font-body', 'font-display', 'font-mono'],
    fontWeight: [
      'font-thin',
      'font-extralight',
      'font-light',
      'font-normal',
      'font-medium',
      'font-semibold',
      'font-bold',
      'font-extrabold',
      'font-black'
    ]
  }
});
