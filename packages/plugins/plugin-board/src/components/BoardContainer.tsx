//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Board as BoardComponent } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';

import { type Board } from '../types';

export type BoardContainerProps = { role: string; board: Board.Board };

export const BoardContainer = ({ board }: BoardContainerProps) => {
  // TODO(burdon): Query (from collection?)
  const items = useMemo(() => [], []);

  // TODO(burdon): Attention attributes.
  return (
    <BoardComponent.Root layout={board.layout}>
      <StackItem.Content toolbar>
        <BoardComponent.Controls />
        <BoardComponent.Container>
          <BoardComponent.Viewport>
            <BoardComponent.Background />
            <BoardComponent.Content items={items} getTitle={(item) => Obj.getLabel(item) ?? item.id} />
          </BoardComponent.Viewport>
        </BoardComponent.Container>
      </StackItem.Content>
    </BoardComponent.Root>
  );
};
