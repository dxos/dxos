//
// Copyright 2023 DXOS.org
//

import { Compass as MapIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const MapFrame = React.lazy(() => import('./MapFrame'));

export const MapFrameRuntime: FrameRuntime<any> = {
  Icon: MapIcon,
  Component: MapFrame,
};
