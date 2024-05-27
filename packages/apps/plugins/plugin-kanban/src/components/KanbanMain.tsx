//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type KanbanType, KanbanColumnType, KanbanItemType, TextV0Type } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { KanbanBoard } from './KanbanBoard';
import { type KanbanModel } from '../types';

const KanbanMain: FC<{ kanban: KanbanType }> = ({ kanban }) => {
  // const { t } = useTranslation(KANBAN_PLUGIN);
  const space = getSpace(kanban);
  if (!space) {
    return null;
  }

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: kanban, // TODO(burdon): How to keep pure?
    createColumn: () => space.db.add(create(KanbanColumnType, { items: [] })),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) => space.db.add(create(KanbanItemType, { title: create(TextV0Type, { content: '' }) })),
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <KanbanBoard model={model} />
    </Main.Content>
  );
};

export default KanbanMain;
