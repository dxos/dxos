//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { Unit } from '@dxos/util';

const SLOW_TIME = 250;

export const Duration: FC<{ duration: number }> = ({ duration }) => (
  <span className={mx(duration > SLOW_TIME && 'text-red-500')}>{String(Unit.Duration(duration))}</span>
);
