//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Kanban as KanbanType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { KanbanBoard } from './KanbanBoard';
import { type KanbanModel } from '../types';

export const KanbanMain: FC<{ data: KanbanType }> = ({ data: object }) => {
  // const { t } = useTranslation(KANBAN_PLUGIN);

  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  if (!space) {
    return null;
  }

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: object, // TODO(burdon): How to keep pure?
    createColumn: () => space.db.add(new KanbanType.Column()),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) => space.db.add(new KanbanType.Item()),
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <KanbanBoard model={model} />
    </Main.Content>
  );
};
