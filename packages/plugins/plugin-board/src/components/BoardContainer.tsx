//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { getSpace } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Board as BoardComponent, type BoardController, type BoardRootProps } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type Board } from '../types';

export type BoardContainerProps = { role: string; board: Board.Board };

export const BoardContainer = ({ board }: BoardContainerProps) => {
  const controller = useRef<BoardController>(null);
  const space = getSpace(board);

  // TODO(burdon): Create effect utility for reactive arrays.
  const [items, setItem] = useState<Type.Expando[]>([]);
  useEffect(() => {
    let t: NodeJS.Timeout;
    effect(() => {
      const refs = [...board.items];
      t = setTimeout(async () => {
        const items = await Ref.Array.loadAll(refs);
        setItem(items.filter(isNonNullable));
      });
    });

    return () => clearTimeout(t);
  }, [board.items]);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position = { x: 0, y: 0 }) => {
      invariant(space);
      // TODO(burdon): Create from menu/intent?
      const obj = space.db.add(Obj.make(Type.Expando, {}));
      board.items.push(Ref.make(obj));
      board.layout.cells[obj.id] = { ...position, width: 1, height: 1 };
      controller.current?.center(position);
    },
    [space, board, controller],
  );

  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>(
    (id) => {
      // TODO(burdon): Impl. DXN.equals and pass in DXN from `id`.
      const idx = board.items.findIndex((ref) => {
        const dxn = ref.dxn.asEchoDXN();
        return dxn?.echoId === id;
      });
      if (idx !== -1) {
        board.items.splice(idx, 1);
      }
      delete board.layout.cells[id];
    },
    [board],
  );

  // TODO(burdon): Use intents so can be undone.
  const handleMove = useCallback<NonNullable<BoardRootProps['onMove']>>(
    (id, position) => {
      const layout = board.layout.cells[id];
      board.layout.cells[id] = { ...layout, ...position };
    },
    [board],
  );

  // TODO(burdon): Attention attributes.
  return (
    <BoardComponent.Root layout={board.layout} onAdd={handleAdd} onDelete={handleDelete} onMove={handleMove}>
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
