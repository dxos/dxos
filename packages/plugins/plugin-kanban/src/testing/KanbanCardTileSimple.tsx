//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Focus, Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { type KanbanCardProps, useKanbanBoard } from '../components';
import { meta } from '../meta';

const KANBAN_CARD_TILE_SIMPLE_NAME = 'KanbanCardTileSimple';

/**
 * Card tile without Surface; for stories and tests when plugin manager is not available.
 */
export const KanbanCardTileSimple = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ data, location, debug }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { model } = useBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const { onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

    const menuItems = useMemo(
      () =>
        onCardRemove
          ? [
              createMenuAction('remove', () => onCardRemove(data), {
                label: t('remove card label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : [],
      [onCardRemove, data, t],
    );

    return (
      <Menu.Root>
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
                <Card.Title>{Obj.getLabel(data)}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Menu.Trigger asChild disabled={!menuItems?.length}>
                  <Toolbar.IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action menu label')}
                  />
                </Menu.Trigger>
                <Menu.Content items={menuItems} />
              </Card.Toolbar>
              <Card.Content>
                <Card.Row>
                  <pre className='text-xs text-description whitespace-pre-wrap'>{JSON.stringify(data)}</pre>
                </Card.Row>
              </Card.Content>
            </Card.Root>
          </Focus.Group>
        </Mosaic.Tile>
      </Menu.Root>
    );
  },
);

KanbanCardTileSimple.displayName = KANBAN_CARD_TILE_SIMPLE_NAME;
