//
// Copyright 2023 DXOS.org
//

import { ListChecks as TaskIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const TaskFrame = React.lazy(() => import('./TaskFrame'));

export const TaskFrameRuntime: FrameRuntime<any> = {
  Icon: TaskIcon,
  Component: TaskFrame,
};
