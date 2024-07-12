//
// Copyright 2023 DXOS.org
//

import { type Icon, IconBase, type IconWeight } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    <>
      <path d='M127.96,85.307l2.83,-2.058l113.742,156.395l-4.684,5.025l-111.888,-69.93l-111.888,69.93l-4.684,-5.025l113.742,-156.395l2.83,2.058Zm100.309,143.873l-100.309,-137.925l-100.309,137.925l98.455,-61.534l3.708,0l98.455,61.534Z' />
      <path d='M127.96,81.181l111.888,-69.93l4.684,5.025l-113.742,156.395l-2.83,-2.058l-2.83,2.058l-113.742,-156.395l4.684,-5.025l111.888,69.93Zm-100.309,-54.441l100.309,137.925l100.309,-137.925l-98.455,61.534l-3.708,-0l-98.455,-61.534Z' />
      <rect x='124.467' y='85.307' width='6.998' height='85.307' />
    </>,
  ],
]);

export const DXOS: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

DXOS.displayName = 'DXOS';
