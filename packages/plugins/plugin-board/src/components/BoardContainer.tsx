//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useSignalsMemo } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Board, type BoardController, type BoardRootProps, type Position } from '@dxos/react-ui-board';
import { ObjectPicker, type ObjectPickerContentProps } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '../types';

const DEFAULT_POSITION = { x: 0, y: 0 } satisfies Position;

type PickerState = {
  position: Position;
};

export type BoardContainerProps = {
  role?: string;
  board: BoardType.Board;
};

export const BoardContainer = ({ board }: BoardContainerProps) => {
  const controller = useRef<BoardController>(null);
  const items = useSignalsMemo(() => board.items.map((ref) => ref.target).filter(isNonNullable), [board]);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const attendableId = fullyQualifiedId(board);
  const { hasAttention } = useAttention(attendableId);

  // TODO(burdon): Use search.
  const objects = useQuery(getSpace(board), Filter.everything());
  const options = useMemo<ObjectPickerContentProps['options']>(
    () =>
      objects
        .filter((obj) => obj.id !== board.id)
        .map((obj) => {
          const label = Obj.getLabel(obj);
          if (label) {
            return {
              id: obj.id,
              label,
              hue: 'neutral' as const,
            };
          }
        })
        .filter(isNonNullable)
        .sort(({ label: a }, { label: b }) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())),
    [objects],
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

  const handleSelect = useCallback<NonNullable<ObjectPickerContentProps['onSelect']>>(
    (id) => {
      if (!pickerState) {
        return;
      }

      // Find the selected object by id from the space.
      const selectedObject = objects.find((obj) => obj.id === id);
      if (!selectedObject) {
        return;
      }

      // Create a reference to the selected object and add it to the board.
      board.items.push(Ref.make(selectedObject));

      // Set the layout position for the new item.
      board.layout.cells[selectedObject.id.toString()] = pickerState.position;

      // Close the picker.
      setPickerState(null);
    },
    [pickerState, objects, board],
  );

  return (
    <Board.Root ref={controller} layout={board.layout} onAdd={handleAdd} onDelete={handleDelete} onMove={handleMove}>
      <ObjectPicker.Root
        open={!!pickerState}
        onOpenChange={(nextOpen: boolean) => {
          setPickerState(nextOpen ? { position: DEFAULT_POSITION } : null);
        }}
      >
        <StackItem.Content toolbar>
          <Board.Toolbar disabled={!hasAttention} />
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
