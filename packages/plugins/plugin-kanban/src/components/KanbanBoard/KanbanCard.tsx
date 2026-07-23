//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Card, IconButton, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Focus, Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';

import { type KanbanCardProps, useKanbanBoard } from './context';

export { type KanbanCardProps };

const KANBAN_CARD_TILE_NAME = 'KanbanBoard.Card';

/**
 * Mosaic Tile for Kanban card.
 * Uses Surface for content; requires plugin manager context.
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ data, location, debug, draggable }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const { model } = useBoard(KANBAN_CARD_TILE_NAME);
    const { projection, columnFieldPath, onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

    // Card.Root already takes the forwarded ref; walk from the header to resolve the origin plank.
    const cardRef = useRef<HTMLDivElement>(null);
    const objectMenuItems = useObjectMenuItems(data, cardRef);

    const menuItems = useMemo(
      () => [
        ...objectMenuItems,
        ...(onCardRemove
          ? [
              createMenuAction('remove', () => onCardRemove(data), {
                label: t('remove-card.label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : []),
      ],
      [objectMenuItems, onCardRemove, data, t],
    );

    return (
      <Menu.Root>
        <Mosaic.Tile
          asChild
          id={model.getItemId(data)}
          data={data}
          location={location}
          debug={debug}
          draggable={draggable}
          dragHandle={dragHandle}
        >
          <Focus.Item asChild>
            <Card.Root ref={forwardedRef} data-testid='board-item'>
              <Card.Header ref={cardRef}>
                <Card.DragHandle ref={dragHandleRef} testId='mosaicBoard.cardDragHandle' />
                <Card.Title data-testid='mosaicBoard.cardTitle'>{Obj.getLabel(data)}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Card.Block end>
                  <Menu.Trigger asChild disabled={!menuItems?.length}>
                    <IconButton
                      iconOnly
                      variant='ghost'
                      icon='ph--dots-three-vertical--regular'
                      label={t('action-menu.label')}
                    />
                  </Menu.Trigger>
                  <Menu.Content items={menuItems} />
                </Card.Block>
              </Card.Header>
              <Card.Body>
                {projection && (
                  <Surface.Surface
                    type={AppSurface.CardContent}
                    limit={1}
                    data={{
                      subject: data,
                      projection,
                      // Hide the pivot field: its value is already conveyed by
                      // which column the card sits in.
                      ignorePaths: columnFieldPath ? [columnFieldPath] : undefined,
                    }}
                  />
                )}
              </Card.Body>
            </Card.Root>
          </Focus.Item>
        </Mosaic.Tile>
      </Menu.Root>
    );
  },
);

KanbanCard.displayName = KANBAN_CARD_TILE_NAME;
