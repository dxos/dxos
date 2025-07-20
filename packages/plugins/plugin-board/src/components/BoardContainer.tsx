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
    <StackItem.Content>
      <BoardComponent.Root layout={board.layout}>
        {/* TODO(burdon): Move to StackItem toolbar; make Board.Root headless so that can be outside of StackItem. */}
        <BoardComponent.Controls />
        <BoardComponent.Viewport>
          <BoardComponent.Background />
          <BoardComponent.Content items={items} getTitle={(item) => Obj.getLabel(item) ?? item.id} />
        </BoardComponent.Viewport>
      </BoardComponent.Root>
    </StackItem.Content>
  );
};
