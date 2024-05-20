//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

const SLOW_TIME = 250;

export const Unit = {
  G: 1_000 * 1_000 * 1_000,
  M: 1_000 * 1_000,
  K: 1_000,
  P: 1 / 100,

  toString: (n: number, dec = 0) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }),
};

export const Duration: FC<{ duration: number }> = ({ duration }) => (
  <span className={mx(duration > SLOW_TIME && 'text-red-500')}>{Unit.toString(duration, 0)}ms</span>
);
