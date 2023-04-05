//
// Copyright 2023 DXOS.org
//

import { Sword as ChessIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '@dxos/kai-frames';

const ChessFrame = React.lazy(() => import('./ChessFrame'));

export const ChessFrameRuntime: FrameRuntime<any> = {
  Icon: ChessIcon,
  Component: ChessFrame
};
