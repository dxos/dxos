//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { type AdditionalClassGroups, twMergeConfig } from './tw-merge-config';

export const mx = extendTailwindMerge<AdditionalClassGroups>({
  extend: {
    ...twMergeConfig.extend,
    classGroups: {
      ...twMergeConfig.extend.classGroups,
      // Arbitrary numeric font-weights require a validator (not expressible as a plain string token).
      'font-weight': [...twMergeConfig.extend.classGroups['font-weight'], validators.isArbitraryNumber],
    },
  },
});
