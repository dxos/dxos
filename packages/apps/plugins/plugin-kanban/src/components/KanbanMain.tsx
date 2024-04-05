//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type KanbanType, KanbanColumnType, KanbanItemType, TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

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
    createColumn: () => space.db.add(E.object(KanbanColumnType, { items: [] })),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) => space.db.add(E.object(KanbanItemType, { title: E.object(TextV0Type, { content: '' }) })),
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <KanbanBoard model={model} />
    </Main.Content>
  );
};

export default KanbanMain;
