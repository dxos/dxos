//
// Copyright 2023 DXOS.org
//

import { Tray as MessageIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const MessageFrame = React.lazy(() => import('./MessageFrame'));

export const MessageFrameRuntime: FrameRuntime<any> = {
  Icon: MessageIcon,
  Component: MessageFrame,
};
