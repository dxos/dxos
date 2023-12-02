//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Kanban as KanbanType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { KanbanBoard } from './KanbanBoard';
import { type KanbanModel } from '../types';

export const KanbanMain: FC<{ kanban: KanbanType }> = ({ kanban }) => {
  // const { t } = useTranslation(KANBAN_PLUGIN);
  const space = getSpaceForObject(kanban);
  if (!space) {
    return null;
  }

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: kanban, // TODO(burdon): How to keep pure?
    createColumn: () => space.db.add(new KanbanType.Column()),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) => space.db.add(new KanbanType.Item()),
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <KanbanBoard model={model} />
    </Main.Content>
  );
};
