//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type KanbanType } from '@dxos/react-ui-kanban';

import { KanbanContainer, KanbanViewEditor } from '../components';
import { KANBAN_PLUGIN } from '../meta';
import { isKanban } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${KANBAN_PLUGIN}/kanban`,
      role: ['article', 'section'],
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data, role }) => <KanbanContainer kanban={data.subject} role={role} />,
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/settings`,
      role: 'complementary--settings',
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data }) => <KanbanViewEditor kanban={data.subject} />,
    }),
  ]);
