//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { composerLogoPaths } from './composer-mark.ts';

export const ComposerLogo = ({ classNames, size = 512 }: ThemedClassName<{ size?: number }>) => (
  <svg aria-hidden='true' width={size} height={size} className={mx(classNames)}>
    {composerLogoPaths(size).map(({ color, d }, i) => (
      <path key={i} fill={color} d={d} />
    ))}
  </svg>
);
