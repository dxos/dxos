//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown/types';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Board, type BoardController, type BoardRootProps, type Position } from '@dxos/react-ui-board';
import { ObjectPicker, type ObjectPickerContentProps } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '#types';

const DEFAULT_POSITION = { x: 0, y: 0 } satisfies Position;

type PickerState = {
  position: Position;
};

export type BoardContainerProps = AppSurface.ObjectArticleProps<BoardType.Board>;

export const BoardContainer = ({ role, subject: board, attendableId }: BoardContainerProps) => {
  const { hasAttention } = useAttention(attendableId);
  const db = Obj.getDatabase(board);
  const [boardItems] = useObject(board, 'items');
  const itemsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const result: Obj.Unknown[] = [];
        for (const ref of boardItems ?? []) {
          const obj = get(AtomObj.makeWithReactive(ref));
          if (obj) {
            result.push(obj);
          }
        }
        return result;
      }),
    [boardItems],
  );
  const items = useAtomValue(itemsAtom);

  const controller = useRef<BoardController>(null);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);

  // TODO(burdon): Use search.
  const objects = useQuery(db, Filter.everything());
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
    async (anchor, position) => {
      const db = Obj.getDatabase(board);
      invariant(db);
      // Grid backdrop "+" supplies a position → create a new Markdown document directly.
      // Toolbar "+" omits position → fall back to the picker over existing objects.
      if (position) {
        const doc = db.add(Markdown.make());
        Obj.update(board, (board) => {
          board.items.push(Ref.make(doc));
          board.layout.cells[doc.id.toString()] = position;
        });
        return;
      }

      addTriggerRef.current = anchor;
      setPickerState({ position: DEFAULT_POSITION });
    },
    [board],
  );

  // TODO(burdon): Use intents so can be undone.
  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>(
    (id) => {
      // TODO(burdon): Impl. DXN.equals and pass in DXN from `id`.
      const idx = board.items.findIndex((ref) => ref.dxn.asEchoDXN()?.echoId === id);
      Obj.update(board, (board) => {
        if (idx !== -1) {
          board.items.splice(idx, 1);
        }
        delete board.layout.cells[id];
      });
    },
    [board],
  );

  const handleMove = useCallback<NonNullable<BoardRootProps['onMove']>>(
    (id, position) => {
      const layout = board.layout.cells[id];
      Obj.update(board, (board) => {
        board.layout.cells[id] = { ...layout, ...position };
      });
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
      if (!Obj.isObject(selectedObject)) {
        return;
      }

      // Create a reference to the selected object and add it to the board.
      Obj.update(board, (board) => {
        board.items.push(Ref.make(selectedObject));

        // Set the layout position for the new item.
        board.layout.cells[selectedObject.id.toString()] = pickerState.position;
      });

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
        <Panel.Root role={role}>
          <Panel.Toolbar asChild>
            <Board.Toolbar disabled={!hasAttention} />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Board.Container>
              <Board.Viewport classNames='border-none'>
                <Board.Backdrop />
                <Board.Content>
                  {items?.map((item, index) => (
                    <Board.Cell item={item} key={index} layout={board.layout?.cells[item.id] ?? { x: 0, y: 0 }}>
                      {/* `editable` opts the cell into the in-place editor variant — surfaces that don't recognize the flag fall back to the read-only card. */}
                      <Surface.Surface type={AppSurface.Card} data={{ subject: item, editable: true }} limit={1} />
                    </Board.Cell>
                  ))}
                </Board.Content>
              </Board.Viewport>
            </Board.Container>
          </Panel.Content>
        </Panel.Root>
        <ObjectPicker.Content options={options} onSelect={handleSelect} classNames='dx-card-popover-width' />
        <ObjectPicker.VirtualTrigger virtualRef={addTriggerRef} />
      </ObjectPicker.Root>
    </Board.Root>
  );
};
