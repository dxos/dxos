//
// Copyright 2023 DXOS.org
//

import { Graph as ExplorerIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const ExplorerFrame = React.lazy(() => import('./ExplorerFrame'));

export const ExplorerFrameRuntime: FrameRuntime<any> = {
  Icon: ExplorerIcon,
  Component: ExplorerFrame,
};
