//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Next, useTranslation } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import { Mosaic, useBoard } from '@dxos/react-ui-mosaic';

import { type KanbanCardProps, useKanbanBoard } from '#components';
import { meta } from '#meta';

const KANBAN_CARD_TILE_SIMPLE_NAME = 'KanbanCardTileSimple';

/**
 * Card tile without Surface; for stories and tests when plugin manager is not available.
 */
export const KanbanCardTileSimple = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ data, location, debug, draggable }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const { model } = useBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const { onCardRemove } = useKanbanBoard(KANBAN_CARD_TILE_SIMPLE_NAME);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const dragHandleRef = useCallback((el: HTMLButtonElement | null) => setDragHandle(el), []);

    const menuItems = useMemo(
      () =>
        onCardRemove
          ? [
              createMenuAction('remove', () => onCardRemove(data), {
                label: t('remove-card.label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : [],
      [onCardRemove, data, t],
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
          <Next.Card.Root ref={forwardedRef} data-testid='board-item'>
            <Next.Card.Header>
              <Next.DragHandle ref={dragHandleRef} />
              <Next.Card.Title>{Obj.getLabel(data)}</Next.Card.Title>
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
              <Next.Card.Row>
                <pre className='p-2 text-xs text-description whitespace-pre-wrap'>{JSON.stringify(data, null, 2)}</pre>
              </Next.Card.Row>
            </Next.Card.Body>
          </Next.Card.Root>
        </Next.Focus.Item>
      </Mosaic.Tile>
    );
  },
);

KanbanCardTileSimple.displayName = KANBAN_CARD_TILE_SIMPLE_NAME;
