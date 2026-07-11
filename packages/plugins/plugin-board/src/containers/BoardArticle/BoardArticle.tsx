//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Board, type BoardController, type BoardRootProps, type Layout, resizeToFit } from '@dxos/react-ui-board';
import { translationKey } from '@dxos/react-ui-board/translations';
import { ObjectPicker, type ObjectPickerContentProps } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { type Board as BoardType } from '#types';

type Position = { x: number; y: number };

const DEFAULT_POSITION: Position = { x: 0, y: 0 };

// Legacy boards stored cells with a centre origin (signed coords); the engine is 0-based, so shift all
// cells to non-negative before handing them to the component. Freshly-created boards are already 0-based.
const normalizeCells = (cells: BoardType.Board['layout']['cells']): Layout['items'] => {
  const values = Object.values(cells);
  const minX = Math.min(0, ...values.map((cell) => cell.x));
  const minY = Math.min(0, ...values.map((cell) => cell.y));
  if (minX === 0 && minY === 0) {
    return cells;
  }
  return Object.fromEntries(
    Object.entries(cells).map(([id, cell]) => [id, { ...cell, x: cell.x - minX, y: cell.y - minY }]),
  );
};

export type BoardArticleProps = AppSurface.ObjectArticleProps<BoardType.Board>;

export const BoardArticle = ({ role, subject: board, attendableId }: BoardArticleProps) => {
  const { t } = useTranslation(translationKey);
  const { hasAttention } = useAttention(attendableId);
  const db = Obj.getDatabase(board);
  const [boardItems] = useObject(board, 'items');
  const itemsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const result: Obj.Unknown[] = [];
        for (const ref of boardItems ?? []) {
          const obj = get(Obj.atomReactive(ref));
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
  const [pickerState, setPickerState] = useState<{ position: Position } | null>(null);
  const [zoom, setZoom] = useState(false);

  const layout = useMemo<Layout>(() => ({ items: normalizeCells(board.layout.cells) }), [board.layout.cells]);
  const bounds = useMemo(
    () => ({ columns: board.layout.size.width, rows: board.layout.size.height }),
    [board.layout.size.width, board.layout.size.height],
  );

  // TODO(burdon): Use search.
  const objects = useQuery(db, Filter.everything());
  const options = useMemo<ObjectPickerContentProps['options']>(
    () =>
      objects
        .filter((obj) => obj.id !== board.id)
        .map((obj) => {
          const label = Obj.getLabel(obj);
          return label ? { id: obj.id, label, hue: 'neutral' as const } : undefined;
        })
        .filter(isNonNullable)
        .sort(({ label: a }, { label: b }) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())),
    [objects, board.id],
  );

  const handleChange = useCallback<NonNullable<BoardRootProps['onChange']>>(
    (next) => {
      Obj.update(board, (board) => {
        board.layout.cells = next.items;
      });
    },
    [board],
  );

  // Backdrop "+" supplies a position → create a new Markdown document directly.
  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position) => {
      const db = Obj.getDatabase(board);
      invariant(db);
      const doc = db.add(Markdown.make());
      Obj.update(board, (board) => {
        board.items.push(Ref.make(doc));
        board.layout.cells[doc.id.toString()] = position;
      });
    },
    [board],
  );

  // TODO(burdon): Use intents so can be undone.
  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>(
    (id) => {
      // TODO(burdon): Impl. DXN.equals and pass in DXN from `id`.
      const idx = board.items.findIndex((ref) => {
        const echoUri = EID.tryParse(ref.uri);
        return (echoUri ? EID.getEntityId(echoUri) : undefined) === id;
      });
      Obj.update(board, (board) => {
        if (idx !== -1) {
          board.items.splice(idx, 1);
        }
        delete board.layout.cells[id];
      });
    },
    [board],
  );

  // Toolbar "+" adds an existing object via the picker.
  const handleSelect = useCallback<NonNullable<ObjectPickerContentProps['onSelect']>>(
    (id) => {
      const position = pickerState?.position ?? DEFAULT_POSITION;
      const selected = objects.find((obj) => obj.id === id);
      if (!Obj.isObject(selected)) {
        return;
      }
      Obj.update(board, (board) => {
        board.items.push(Ref.make(selected));
        board.layout.cells[selected.id.toString()] = position;
      });
      setPickerState(null);
    },
    [pickerState, objects, board],
  );

  return (
    <ObjectPicker.Root
      open={!!pickerState}
      onOpenChange={(next: boolean) => setPickerState(next ? { position: DEFAULT_POSITION } : null)}
    >
      <Board.Root
        ref={controller}
        layout={layout}
        bounds={bounds}
        mode='float'
        resolver={resizeToFit}
        zoom={zoom}
        onChange={handleChange}
        onAdd={handleAdd}
        onDelete={handleDelete}
      >
        <Panel.Root role={role}>
          {/* TODO(burdon): Migrate to Menu.Root + useMenuActions (threading attendableId). */}
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--crosshair--regular'
                iconOnly
                label={t('move-to-center.button')}
                disabled={!hasAttention}
                onClick={() => controller.current?.center()}
              />
              <Toolbar.IconButton
                icon={zoom ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
                iconOnly
                label={t('toggle-zoom.button')}
                disabled={!hasAttention}
                onClick={() => setZoom((value) => !value)}
              />
              <Toolbar.IconButton
                icon='ph--plus--regular'
                iconOnly
                label={t('add-object.button')}
                disabled={!hasAttention}
                onClick={(event) => {
                  addTriggerRef.current = event.currentTarget as HTMLButtonElement;
                  setPickerState({ position: DEFAULT_POSITION });
                }}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Board.Container classNames='absolute inset-0'>
              <Board.Viewport>
                <Board.Backdrop />
                <Board.Content>
                  {items?.map((item) => {
                    const itemLayout = layout.items[item.id];
                    return itemLayout ? (
                      <Board.Cell item={item} key={item.id} layout={itemLayout}>
                        <Surface.Surface
                          type={AppSurface.CardContent}
                          data={{ subject: item, editable: true }}
                          limit={1}
                        />
                      </Board.Cell>
                    ) : null;
                  })}
                </Board.Content>
              </Board.Viewport>
            </Board.Container>
          </Panel.Content>
        </Panel.Root>
      </Board.Root>
      <ObjectPicker.Content options={options} onSelect={handleSelect} classNames='dx-card-popover-width' />
      <ObjectPicker.VirtualTrigger virtualRef={addTriggerRef} />
    </ObjectPicker.Root>
  );
};

BoardArticle.displayName = 'BoardArticle';
