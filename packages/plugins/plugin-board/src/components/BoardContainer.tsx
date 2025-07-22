//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { createIntent, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { type Obj, Ref, type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Board, type BoardController, type BoardRootProps } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '../types';

export type BoardContainerProps = {
  role: string;
  board: BoardType.Board;
};

export const BoardContainer = ({ role, board }: BoardContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const controller = useRef<BoardController>(null);

  // TODO(burdon): Create effect utility for reactive arrays.
  const [items, setItems] = useState<Type.Expando[]>([]);
  useEffect(() => {
    let t: NodeJS.Timeout;
    effect(() => {
      const refs = [...board.items];
      t = setTimeout(async () => {
        const items = await Ref.Array.loadAll(refs);
        setItems(items.filter(isNonNullable));
      });
    });

    return () => clearTimeout(t);
  }, [board.items]);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    async (position = { x: 0, y: 0 }) => {
      const space = getSpace(board);
      invariant(space);
      await dispatch(
        createIntent(SpaceAction.OpenCreateObject, {
          target: space,
          navigable: false,
          onCreateObject: (object: Obj.Any) => {
            board.items.push(Ref.make(object));
            board.layout.cells[object.id] = { ...position, width: 1, height: 1 };
            controller.current?.center(position);
          },
        }),
      );
    },
    [board, controller, dispatch],
  );

  // TODO(burdon): Use intents so can be undone.
  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>(
    (id) => {
      // TODO(burdon): Impl. DXN.equals and pass in DXN from `id`.
      const idx = board.items.findIndex((ref) => ref.dxn.asEchoDXN()?.echoId === id);
      if (idx !== -1) {
        board.items.splice(idx, 1);
      }
      delete board.layout.cells[id];
      setItems((items) => items.filter((item) => item.id !== id));
    },
    [board],
  );

  const handleMove = useCallback<NonNullable<BoardRootProps['onMove']>>(
    (id, position) => {
      const layout = board.layout.cells[id];
      board.layout.cells[id] = { ...layout, ...position };
    },
    [board],
  );

  return (
    <Board.Root ref={controller} layout={board.layout} onAdd={handleAdd} onDelete={handleDelete} onMove={handleMove}>
      <StackItem.Content toolbar>
        <Board.Controls />
        <Board.Container>
          <Board.Viewport classNames='border-none'>
            <Board.Backdrop />
            <Board.Content>
              {items?.map((item, index) => (
                <Board.Cell item={item} key={index} layout={board.layout?.cells[item.id] ?? { x: 0, y: 0 }}>
                  <Surface role='card--board' data={{ subject: item }} />
                </Board.Cell>
              ))}
            </Board.Content>
          </Board.Viewport>
        </Board.Container>
      </StackItem.Content>
    </Board.Root>
  );
};
