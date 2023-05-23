//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanIcon } from '@phosphor-icons/react';
import React from 'react';

import { Kanban } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

const KanbanFrame = React.lazy(() => import('./KanbanFrame'));

export const KanbanFrameRuntime: FrameRuntime<Kanban> = {
  Icon: KanbanIcon,
  Component: KanbanFrame,
};
