//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '@dxos/kai-frames';
import { Kanban } from '@dxos/kai-types';

const KanbanFrame = React.lazy(() => import('./KanbanFrame'));

export const KanbanFrameRuntime: FrameRuntime<Kanban> = {
  Icon: KanbanIcon,
  Component: KanbanFrame
};
