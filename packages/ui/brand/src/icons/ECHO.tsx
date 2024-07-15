//
// Copyright 2023 DXOS.org
//

import { type Icon, IconBase, type IconWeight } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    <>
      <path d='M20.206,95.214l213.266,72.121l2.242,-6.628l-213.266,-72.123l-2.242,6.63Z' />
      <path d='M233.472,88.584l-213.266,72.123l2.242,6.628l213.266,-72.121l-2.242,-6.63Z' />
      <path d='M127.96,122.86l104.017,-111.034l6.053,2.392l-0.034,227.485l-6.053,2.391l-103.983,-110.998l-103.983,110.998l-6.053,-2.391l-0.033,-227.485l6.052,-2.392l104.017,111.034Zm4.795,5.118l98.244,104.873l0.032,-209.779l-98.276,104.906Zm-107.834,104.873l98.245,-104.873l-98.276,-104.906l0.031,209.779Z' />
    </>,
  ],
]);

export const ECHO: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

ECHO.displayName = 'ECHO';
