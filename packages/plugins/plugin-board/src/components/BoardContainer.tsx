//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Surface, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { type Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useSignalsMemo } from '@dxos/react-ui';
import { Board, type BoardController, type BoardRootProps } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '../types';

export type BoardContainerProps = {
  role?: string;
  board?: BoardType.Board;
  view?: DataType.View;
};

export const BoardContainer = ({ board: _board, view }: BoardContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const controller = useRef<BoardController>(null);
  const board = _board ?? (view?.presentation.target as BoardType.Board | undefined);

  // TODO(wittjosiah): If coming from a view need to fetch items via query.
  const items = useSignalsMemo(() => (board?.items ?? []).map((ref) => ref.target).filter(isNonNullable), [board]);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    async (position = { x: 0, y: 0 }) => {
      invariant(board);
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
      invariant(board);
      // TODO(burdon): Impl. DXN.equals and pass in DXN from `id`.
      const idx = board.items.findIndex((ref) => ref.dxn.asEchoDXN()?.echoId === id);
      if (idx !== -1) {
        board.items.splice(idx, 1);
      }
      delete board.layout.cells[id];
    },
    [board],
  );

  const handleMove = useCallback<NonNullable<BoardRootProps['onMove']>>(
    (id, position) => {
      invariant(board);
      const layout = board.layout.cells[id];
      board.layout.cells[id] = { ...layout, ...position };
    },
    [board],
  );

  if (!board) {
    return null;
  }

  return (
    <Board.Root ref={controller} layout={board.layout} onAdd={handleAdd} onDelete={handleDelete} onMove={handleMove}>
      <StackItem.Content toolbar classNames='overflow-hidden'>
        <Board.Toolbar />
        <Board.Container>
          <Board.Viewport classNames='border-none'>
            <Board.Backdrop />
            <Board.Content>
              {items?.map((item, index) => (
                <Board.Cell item={item} key={index} layout={board.layout?.cells[item.id] ?? { x: 0, y: 0 }}>
                  <Surface role='card--extrinsic' data={{ subject: item }} limit={1} />
                </Board.Cell>
              ))}
            </Board.Content>
          </Board.Viewport>
        </Board.Container>
      </StackItem.Content>
    </Board.Root>
  );
};
