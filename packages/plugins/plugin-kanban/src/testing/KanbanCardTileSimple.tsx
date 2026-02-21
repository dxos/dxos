//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card, Focus, Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { type KanbanCardTileProps, useKanbanBoard } from '../components/KanbanBoard';
import { meta } from '../meta';

const KANBAN_CARD_TILE_SIMPLE_NAME = 'KanbanCardTileSimple';

/** Card tile without Surface; for stories and tests when plugin manager is not available. */
export const KanbanCardTileSimple = forwardRef<HTMLDivElement, KanbanCardTileProps>(
  ({ classNames, data, location, debug }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { model } = useBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const { onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

    const menuItems = useMemo(
      () =>
        onCardRemove
          ? [
              {
                label: t('remove card label'),
                onClick: (card: Obj.Unknown) => onCardRemove(card),
              },
            ]
          : [],
      [onCardRemove, t],
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
              <div className='p-2 text-sm text-fg'>{Obj.getLabel(data)}</div>
            </Card.Content>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

KanbanCardTileSimple.displayName = KANBAN_CARD_TILE_SIMPLE_NAME;
