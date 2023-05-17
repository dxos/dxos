//
// Copyright 2023 DXOS.org
//

import { Chat as ChatIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const ChatFrame = React.lazy(() => import('./ChatFrame'));

export const ChatFrameRuntime: FrameRuntime<any> = {
  Icon: ChatIcon,
  Component: ChatFrame,
};
