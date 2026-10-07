//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useAttention } from '@dxos/react-ui-attention';
import {
  Board as BoardComponent,
  type BoardController,
  type BoardRootProps,
  type Layout,
  resizeToFit,
} from '@dxos/react-ui-board';
import { translationKey } from '@dxos/react-ui-board/translations';
import { ObjectPicker, type ObjectPickerProps } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { isNonNullable } from '@dxos/util';

import { Board } from '#types';

type Position = { x: number; y: number };

const DEFAULT_POSITION: Position = { x: 0, y: 0 };

// Legacy boards stored cells with a centre origin (signed coords); the engine is 0-based, so shift all
// cells to non-negative before handing them to the component. Freshly-created boards are already 0-based.
const normalizeCells = (cells: Board.Board['layout']['cells']): Layout['items'] => {
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

export type BoardArticleProps = AppSurface.ObjectArticleProps<Board.Board>;

export const BoardArticle = ({ role, subject: board, attendableId }: BoardArticleProps) => {
  const { t } = Hooks.useTranslation(translationKey);
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
  const [zoom, setZoom] = useState(1);

  const [{ layout: boardLayout }] = useObject(board);
  const layout = useMemo<Layout>(() => ({ items: normalizeCells(boardLayout.cells) }), [boardLayout.cells]);
  const bounds = useMemo(
    () => ({ columns: boardLayout.size.width, rows: boardLayout.size.height }),
    [boardLayout.size.width, boardLayout.size.height],
  );

  // TODO(burdon): Use search.
  const objects = useQuery(db, Filter.everything());
  const optionsAtom = useMemo(
    () =>
      Atom.make((get): ObjectPickerProps['options'] =>
        objects
          .filter((obj) => obj.id !== board.id)
          .map((obj) => {
            const label = get(Obj.labelAtom(obj));
            return label ? { id: obj.id, label, hue: 'neutral' as const } : undefined;
          })
          .filter(isNonNullable)
          .sort(({ label: a }, { label: b }) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())),
      ),
    [objects, board.id],
  );
  const options = useAtomValue(optionsAtom);

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
  const handleSelect = useCallback(
    (id: string | undefined) => {
      const position = DEFAULT_POSITION;
      const selected = objects.find((obj) => obj.id === id);
      if (!Obj.isObject(selected)) {
        return;
      }
      Obj.update(board, (board) => {
        board.items.push(Ref.make(selected));
        board.layout.cells[selected.id.toString()] = position;
      });
    },
    [objects, board],
  );

  return (
    <BoardComponent.Root
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
        <Panel.Header>
          <Toolbar.Root>
            <Button.Root
              icon='ph--crosshair--regular'
              iconOnly
              label={t('move-to-center.button')}
              disabled={!hasAttention}
              onClick={() => controller.current?.center()}
            />
            <Button.Root
              icon={zoom < 1 ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
              iconOnly
              label={t('toggle-zoom.button')}
              disabled={!hasAttention}
              onClick={() => setZoom((value) => (value < 1 ? 1 : 0.5))}
            />
            <ObjectPicker
              options={options}
              onSelect={handleSelect}
              trigger={
                <Button.Root
                  icon='ph--plus--regular'
                  iconOnly
                  label={t('add-object.button')}
                  disabled={!hasAttention}
                />
              }
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <BoardComponent.Container classNames='dx-cover'>
            <BoardComponent.Viewport>
              <BoardComponent.Backdrop />
              <BoardComponent.Content>
                {items?.map((item) => {
                  const itemLayout = layout.items[item.id];
                  return itemLayout ? (
                    <BoardComponent.Cell item={item} key={item.id} layout={itemLayout}>
                      <Surface.Surface
                        type={AppSurface.CardContent}
                        data={{ subject: item, editable: true }}
                        limit={1}
                      />
                    </BoardComponent.Cell>
                  ) : null;
                })}
              </BoardComponent.Content>
            </BoardComponent.Viewport>
            {/* Overview map (outlines the visible region), pinned to the corner over the board. */}
            <BoardComponent.Map classNames='absolute bottom-2 right-2 z-10 w-40' />
          </BoardComponent.Container>
        </Panel.Body>
      </Panel.Root>
    </BoardComponent.Root>
  );
};

BoardArticle.displayName = 'BoardArticle';
