//
// Copyright 2023 DXOS.org
//

import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useComposedRefs } from '@dxos/react-hooks';
import { useTranslation } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu/next';
import { Next } from '@dxos/react-ui/next';
import { getHashStyles } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { Focus } from '../Focus/index.ts';
import { Mosaic, type MosaicTileProps } from '../Mosaic/index.ts';
import { useBoardColumn } from './BoardColumnContext.ts';
import { useBoard } from './BoardContext.ts';

const BOARD_ITEM_NAME = 'Board.Item';

type BoardItemProps<TItem extends Obj.Unknown = any> = Pick<
  MosaicTileProps<TItem>,
  'classNames' | 'location' | 'data' | 'debug' | 'draggable'
>;

const BoardItemInner = forwardRef<HTMLDivElement, BoardItemProps>(
  ({ classNames, data, location, debug, draggable }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    // Use state (callback ref) so the dragHandle prop updates when the button mounts.
    // Refs don't trigger re-renders, so reading `.current` at render time leaves the prop null.
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);

    const { model } = useBoard(BOARD_ITEM_NAME);
    const column = useBoardColumn();
    const items = useMemo(
      () =>
        column != null && model.onItemDelete
          ? [
              createMenuAction('delete-item', () => model.onItemDelete?.(column, data), {
                label: t('delete-menu.label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : [],
      [column, data, model.onItemDelete, t],
    );

    if (!data) {
      return null;
    }

    const label = Obj.getLabel(data);
    const description = Obj.getDescription(data);

    return (
      <Mosaic.Tile
        ref={rootRef}
        asChild
        draggable={draggable}
        dragHandle={dragHandle}
        id={data.id}
        data={data}
        location={location}
        debug={debug}
      >
        <Focus.Item asChild>
          <Next.Card.Root
            classNames={classNames}
            data-testid='board-item'
            ref={composedRef}
            onClick={(event) => event.currentTarget.focus()}
          >
            <Next.Card.Header>
              <Next.DragHandle ref={setDragHandle} testId='mosaicBoard.cardDragHandle' />
              <Next.Card.Title data-testid='mosaicBoard.cardTitle'>{label}</Next.Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Next.Block end>
                <ActionMenu disabled={!items?.length} actions={items}>
                  <Next.Button
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action-menu.label')}
                  />
                </ActionMenu>
              </Next.Block>
            </Next.Card.Header>
            {/* TODO(burdon): Replace with surface. */}
            <Next.Card.Row classNames='text-description'>
              <Next.Block>
                <Next.Icon icon='ph--note--regular' />
              </Next.Block>
              <Next.Card.Text>{description}</Next.Card.Text>
            </Next.Card.Row>
            <Next.Card.Row>
              <Next.Block>
                <Next.Icon icon='ph--tag--regular' />
              </Next.Block>
              {label && (
                <div className='shrink-0 flex gap-1 items-center text-xs'>
                  <Next.Tag hue={getHashStyles(label).hue}>{label}</Next.Tag>
                </div>
              )}
            </Next.Card.Row>
          </Next.Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

BoardItemInner.displayName = BOARD_ITEM_NAME;

/**
 * Default board tile.
 */
const BoardItem = BoardItemInner as <TItem extends Obj.Unknown = any>(
  props: BoardItemProps<TItem> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

export { BoardItem, type BoardItemProps };
