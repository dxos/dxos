//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Next, useTranslation } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import { Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';

import { type KanbanCardProps, useKanbanBoard } from './context.ts';

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
    const [cardRef, pivotId] = useCardPivot();
    const objectMenuItems = useObjectMenuItems(data, pivotId);

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
      <Mosaic.Tile
        asChild
        id={model.getItemId(data)}
        data={data}
        location={location}
        debug={debug}
        draggable={draggable}
        dragHandle={dragHandle}
      >
        <Next.Focus.Item asChild>
          <Next.Card.Root grid ref={forwardedRef} data-testid='board-item'>
            <Next.Card.Header ref={cardRef}>
              <Next.DragHandle ref={dragHandleRef} data-testid='mosaicBoard.cardDragHandle' />
              <Next.Card.Title data-testid='mosaicBoard.cardTitle'>{Obj.getLabel(data)}</Next.Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Next.Block rail='end'>
                <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                  <Next.Button
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action-menu.label')}
                  />
                </ActionMenu>
              </Next.Block>
            </Next.Card.Header>
            <Next.Card.Body>
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
            </Next.Card.Body>
          </Next.Card.Root>
        </Next.Focus.Item>
      </Mosaic.Tile>
    );
  },
);

KanbanCard.displayName = KANBAN_CARD_TILE_NAME;
