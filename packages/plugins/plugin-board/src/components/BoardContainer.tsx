//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { getSpace } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useAsyncState } from '@dxos/react-ui';
import { Board as BoardComponent, type BoardController, type BoardRootProps } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type Board } from '../types';

export type BoardContainerProps = { role: string; board: Board.Board };

export const BoardContainer = ({ board }: BoardContainerProps) => {
  const controller = useRef<BoardController>(null);
  const space = getSpace(board);

  const [items] = useAsyncState(
    async () => (await Ref.Array.loadAll(board.items)).filter(isNonNullable),
    [board.items], // TODO(burdon): This doesn't seem to be reactive.
  );

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position = { x: 0, y: 0 }) => {
      invariant(space);
      // TODO(burdon): Create from menu.
      const obj = space.db.add(Obj.make(Type.Expando, {}));
      board.items.push(Ref.make(obj));
      board.layout.cells[obj.id] = { ...position, width: 1, height: 1 };
      controller.current?.center(position);
    },
    [space, board, controller],
  );

  // TODO(burdon): Attention attributes.
  return (
    <BoardComponent.Root layout={board.layout} onAdd={handleAdd}>
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
