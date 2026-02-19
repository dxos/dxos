//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card, Focus, Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { meta } from '../meta';

import { type KanbanCardTileProps, useKanbanBoard } from './KanbanBoardContext';

const KANBAN_CARD_TILE_NAME = 'KanbanCardTile';

/** Card tile that uses Surface for content; requires plugin manager context. */
export const KanbanCardTile = forwardRef<HTMLDivElement, KanbanCardTileProps>(
  ({ classNames, data, location, debug }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { model } = useBoard(KANBAN_CARD_TILE_NAME);
    const { projection, onRemoveCard } = useKanbanBoard(KANBAN_CARD_TILE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useMemo(() => (el: HTMLButtonElement | null) => setDragHandle(el), []);

    const menuItems = useMemo(
      () =>
        onRemoveCard
          ? [
              {
                label: t('remove card label'),
                onClick: (card: Obj.Unknown) => onRemoveCard(card),
              },
            ]
          : [],
      [onRemoveCard, t],
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
          <Card.Root classNames={classNames} ref={forwardedRef} data-testid='board-item'>
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Title>{Obj.getLabel(data)}</Card.Title>
              {menuItems.length > 0 && <Card.Menu context={data} items={menuItems} />}
            </Card.Toolbar>
            <Card.Content>
              {projection && <Surface.Surface role='card--content' limit={1} data={{ subject: data, projection }} />}
            </Card.Content>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

KanbanCardTile.displayName = KANBAN_CARD_TILE_NAME;
