//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Icon, IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { getHashStyles } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { Focus } from '../Focus';
import { Mosaic, type MosaicTileProps } from '../Mosaic';
import { useBoard } from './Board';
import { useBoardColumn } from './Column';

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
      <Menu.Root>
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
            <Card.Root
              classNames={classNames}
              data-testid='board-item'
              ref={composedRef}
              onClick={(event) => event.currentTarget.focus()}
            >
              <Card.Header>
                <Card.DragHandle ref={setDragHandle} testId='mosaicBoard.cardDragHandle' />
                <Card.Title data-testid='mosaicBoard.cardTitle'>{label}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Card.Block end>
                  <Menu.Trigger asChild disabled={!items?.length}>
                    <IconButton
                      iconOnly
                      variant='ghost'
                      icon='ph--dots-three-vertical--regular'
                      label={t('action-menu.label')}
                    />
                  </Menu.Trigger>
                </Card.Block>
                <Menu.Content items={items} />
              </Card.Header>
              {/* TODO(burdon): Replace with surface. */}
              <Card.Row classNames='text-description'>
                <Card.Block>
                  <Icon icon='ph--note--regular' />
                </Card.Block>
                <Card.Text>{description}</Card.Text>
              </Card.Row>
              <Card.Row>
                <Card.Block>
                  <Icon icon='ph--tag--regular' />
                </Card.Block>
                {label && (
                  <div className='shrink-0 flex gap-1 items-center text-xs'>
                    <Tag palette={getHashStyles(label).hue}>{label}</Tag>
                  </div>
                )}
              </Card.Row>
            </Card.Root>
          </Focus.Item>
        </Mosaic.Tile>
      </Menu.Root>
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
