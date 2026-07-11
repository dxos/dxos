//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { useCallback, useMemo, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { Panel } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Board, type BoardController, type BoardRootProps, type Layout, resizeToFit } from '@dxos/react-ui-board';

import { type Board as BoardType } from '#types';

export type BoardArticleProps = AppSurface.ObjectArticleProps<BoardType.Board>;

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

export const BoardArticle = ({ role, subject: board, attendableId }: BoardArticleProps) => {
  const { hasAttention: _hasAttention } = useAttention(attendableId);
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

  const layout = useMemo<Layout>(() => ({ items: normalizeCells(board.layout.cells) }), [board.layout.cells]);
  const bounds = useMemo(
    () => ({ columns: board.layout.size.width, rows: board.layout.size.height }),
    [board.layout.size.width, board.layout.size.height],
  );

  const handleChange = useCallback<NonNullable<BoardRootProps['onChange']>>(
    (next) => {
      Obj.update(board, (board) => {
        board.layout.cells = next.items;
      });
    },
    [board],
  );

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

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <Board.Root
          ref={controller}
          layout={layout}
          bounds={bounds}
          mode='float'
          resolver={resizeToFit}
          onChange={handleChange}
          onAdd={handleAdd}
          onDelete={handleDelete}
        >
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
        </Board.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

BoardArticle.displayName = 'BoardArticle';
