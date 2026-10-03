//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import { Mosaic, useBoard } from '@dxos/react-ui-mosaic';
import * as Block from '@dxos/react-ui/Block';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as DragHandle from '@dxos/react-ui/DragHandle';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';

import { type KanbanCardProps, useKanbanBoard } from '#components';
import { meta } from '#meta';

const KANBAN_CARD_TILE_SIMPLE_NAME = 'KanbanCardTileSimple';

/**
 * Card tile without Surface; for stories and tests when plugin manager is not available.
 */
export const KanbanCardTileSimple = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ data, location, debug, draggable }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
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
        <Focus.Item asChild>
          <Card.Root ref={forwardedRef} data-testid='board-item'>
            <Card.Header>
              <DragHandle.DragHandle ref={dragHandleRef} />
              <Card.Title>{Obj.getLabel(data)}</Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Block.Block rail='end'>
                <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                  <Button.Button
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action-menu.label')}
                  />
                </ActionMenu>
              </Block.Block>
            </Card.Header>
            <Card.Body>
              <Card.Row>
                <pre className='p-2 text-xs text-fg-muted whitespace-pre-wrap'>{JSON.stringify(data, null, 2)}</pre>
              </Card.Row>
            </Card.Body>
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

KanbanCardTileSimple.displayName = KANBAN_CARD_TILE_SIMPLE_NAME;
