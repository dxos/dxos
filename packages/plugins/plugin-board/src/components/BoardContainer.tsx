//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, Ref, getSpace } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';
import { useSignalsMemo } from '@dxos/react-ui';
import { Board, type BoardController, type BoardRootProps, type Position } from '@dxos/react-ui-board';
import { ObjectPicker } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '../types';

export type BoardContainerProps = {
  role?: string;
  board: BoardType.Board;
};

const DEFAULT_POSITION = { x: 0, y: 0 } satisfies Position;

type PickerState = {
  position: Position;
};

export const BoardContainer = ({ board }: BoardContainerProps) => {
  const controller = useRef<BoardController>(null);
  const items = useSignalsMemo(() => board.items.map((ref) => ref.target).filter(isNonNullable), [board]);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);

  // Memoize options for ObjectPicker containing all ECHO objects in the same space as the Board
  const allObjects = useQuery(getSpace(board), Filter.everything());
  const options = useMemo(
    () =>
      allObjects.map((obj) => ({
        id: obj.id,
        label: obj.name || obj.title || obj.id,
        hue: 'neutral' as const,
      })),
    [allObjects],
  );

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    async (anchor, position = DEFAULT_POSITION) => {
      const space = getSpace(board);
      invariant(space);
      addTriggerRef.current = anchor;
      setPickerState({
        position,
      });
    },
    [board],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (!pickerState) return;

      // Find the selected object by id from the space
      const selectedObject = allObjects.find((obj) => obj.id === id);
      if (!selectedObject) return;

      // Create a reference to the selected object and add it to the board
      const ref = Ref.make(selectedObject);
      board.items.push(ref);

      // Set the layout position for the new item
      board.layout.cells[selectedObject.id.toString()] = pickerState.position;

      // Close the picker
      setPickerState(null);
    },
    [pickerState, allObjects, board],
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
      <ObjectPicker.Root
        open={!!pickerState}
        onOpenChange={(nextOpen: boolean) => {
          setPickerState(
            nextOpen
              ? {
                  position: DEFAULT_POSITION,
                }
              : null,
          );
        }}
      >
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
        <ObjectPicker.Content options={options} onSelect={handleSelect} classNames='popover-card-width' />
        <ObjectPicker.VirtualTrigger virtualRef={addTriggerRef} />
      </ObjectPicker.Root>
    </Board.Root>
  );
};
