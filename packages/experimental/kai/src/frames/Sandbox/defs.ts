//
// Copyright 2023 DXOS.org
//

import { Code as SandboxIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '@dxos/kai-frames';

const SandboxFrame = React.lazy(() => import('./SandboxFrame'));

export const SandboxFrameRuntime: FrameRuntime<any> = {
  Icon: SandboxIcon,
  Component: SandboxFrame
};
