//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems, useObjectNavigate } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { Card, Focus, Mosaic, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';

import { meta } from '../../meta';

import { useKanbanBoard } from './KanbanBoard';

const KANBAN_CARD_TILE_NAME = 'KanbanBoard.Card';

export type KanbanCardProps = Pick<MosaicTileProps<Obj.Unknown>, 'location' | 'data' | 'debug'>;

/**
 * Mosaic Tile for Kanban card.
 * Uses Surface for content; requires plugin manager context.
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(({ data, location, debug }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const { model } = useBoard(KANBAN_CARD_TILE_NAME);
  const { projection, onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_NAME);
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
  const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

  const objectMenuItems = useObjectMenuItems(data);
  const handleNavigate = useObjectNavigate(data);

  const menuItems = useMemo(
    () => [
      ...objectMenuItems,
      ...(onCardRemove
        ? [
            createMenuAction('remove', () => onCardRemove(data), {
              label: t('remove card label'),
              icon: 'ph--trash--regular',
            }),
          ]
        : []),
    ],
    [objectMenuItems, onCardRemove, data, t],
  );

  return (
    <Mosaic.Tile
      asChild
      id={model.getItemId(data)}
      data={data}
      location={location}
      debug={debug}
      dragHandle={dragHandle}
    >
      <Focus.Group asChild>
        <Card.Root ref={forwardedRef} data-testid='board-item'>
          <Card.Toolbar>
            <Card.DragHandle ref={dragHandleRef} />
            <Card.Title onClick={handleNavigate}>{Obj.getLabel(data)}</Card.Title>
            <Card.Menu items={menuItems} />
          </Card.Toolbar>
          <Card.Content>
            {projection && <Surface.Surface role='card--content' limit={1} data={{ subject: data, projection }} />}
          </Card.Content>
        </Card.Root>
      </Focus.Group>
    </Mosaic.Tile>
  );
});

KanbanCard.displayName = KANBAN_CARD_TILE_NAME;
