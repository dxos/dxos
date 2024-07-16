//
// Copyright 2023 DXOS.org
//

import { type Icon, IconBase, type IconWeight } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    <>
      <path d='M202.206,23.705l-25.956,36.48c-14.091,-10.026 -30.956,-15.413 -48.25,-15.413c-45.935,-0 -83.228,37.293 -83.228,83.228c-0,45.935 37.293,83.228 83.228,83.228c17.294,0 34.159,-5.387 48.25,-15.413l25.956,36.48c-21.672,15.42 -47.609,23.705 -74.206,23.705c-70.645,-0 -128,-57.355 -128,-128c0,-70.645 57.355,-128 128,-128c26.597,0 52.534,8.285 74.206,23.705Z' />
    </>,
  ],
]);

export const Composer: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

Composer.displayName = 'Composer';
