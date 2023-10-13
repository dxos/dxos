//
// Copyright 2023 DXOS.org
//

import { type IconWeight, type Icon, IconBase } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

// TODO(wittjosiah): This is a workaround until we have utilities to compose icons.
//   This is a combination of the Circle and Dot icons.

const weights = new Map<IconWeight, ReactElement>([
  [
    'bold',
    <>
      <path d='M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Z' />
      <path d='M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128Z' />
    </>,
  ],
  [
    'duotone',
    <>
      <path d='M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z' opacity='0.2' />
      <path d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z' />
      <path d='M176,128a48,48,0,1,1-48-48A48,48,0,0,1,176,128Z' opacity='0.2' />
      <path d='M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Z' />
    </>,
  ],
  [
    'fill',
    <>
      <path d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z' />
      <path d='M128,80a48,48,0,1,0,48,48A48,48,0,0,0,128,80Zm0,60a12,12,0,1,1,12-12A12,12,0,0,1,128,140Z' />
    </>,
  ],
  [
    'light',
    <>
      <path d='M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm0,192a90,90,0,1,1,90-90A90.1,90.1,0,0,1,128,218Z' />
      <path d='M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128Z' />
    </>,
  ],
  [
    'regular',
    <>
      <path d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z' />
      <path d='M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Z' />
    </>,
  ],
  [
    'thin',
    <>
      <path d='M128,28A100,100,0,1,0,228,128,100.11,100.11,0,0,0,128,28Zm0,192a92,92,0,1,1,92-92A92.1,92.1,0,0,1,128,220Z' />
      <path d='M136,128a8,8,0,1,1-8-8A8,8,0,0,1,136,128Z' />
    </>,
  ],
]);

const Issue: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

Issue.displayName = 'Issue';

export { Issue };
