//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Obj } from '@dxos/echo';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import { Focus, Mosaic, useBoard } from '@dxos/react-ui-mosaic';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as IconButton from '@dxos/react-ui/IconButton';

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
    const { t } = Hooks.useTranslation(meta.profile.key);
    const { model } = useBoard(KANBAN_CARD_TILE_NAME);
    const { projection, columnFieldPath, onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

    // Card.Root already takes the forwarded ref; walk from the header to resolve the origin plank.
    const [cardRef, pivotId] = ToolkitHooks.useCardPivot();
    const objectMenuItems = ToolkitHooks.useObjectMenuItems(data, pivotId);

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
        <Focus.Item asChild>
          <Card.Root ref={forwardedRef} data-testid='board-item'>
            <Card.Header ref={cardRef}>
              <Card.DragHandle ref={dragHandleRef} testId='mosaicBoard.cardDragHandle' />
              <Card.Title data-testid='mosaicBoard.cardTitle'>{Obj.getLabel(data)}</Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Card.Block end>
                <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                  <IconButton.Root
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action-menu.label')}
                  />
                </ActionMenu>
              </Card.Block>
            </Card.Header>
            <Card.Body>
              {projection && (
                <Surface.Root.Surface
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
    );
  },
);

KanbanCard.displayName = KANBAN_CARD_TILE_NAME;
