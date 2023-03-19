//
// Copyright 2023 DXOS.org
//

import { House as HomeIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const HomeFrame = React.lazy(() => import('./HomeFrame'));

export const HomeFrameRuntime: FrameRuntime<any> = {
  Icon: HomeIcon,
  Component: HomeFrame
};
