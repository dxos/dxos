//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

const SLOW_TIME = 250;

export const Unit = {
  M: 1_000 * 1_000,
  P: 1 / 100,
  fixed: (n: number, s = 1) => (n / s).toFixed(2),
};

export const Duration: FC<{ duration: number }> = ({ duration }) => (
  <span className={mx(duration > SLOW_TIME && 'text-red-500')}>{Math.floor(duration).toLocaleString()}ms</span>
);
