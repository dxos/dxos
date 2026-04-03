//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { getHashStyles } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Focus } from '../Focus';
import { Mosaic, type MosaicTileProps } from '../Mosaic';

import { useBoard } from './Board';
import { useBoardColumn } from './Column';

const BOARD_ITEM_NAME = 'Board.Item';

type BoardItemProps<TItem extends Obj.Unknown = any> = Pick<
  MosaicTileProps<TItem>,
  'classNames' | 'location' | 'data' | 'debug'
>;

const BoardItemInner = forwardRef<HTMLDivElement, BoardItemProps>(
  ({ classNames, data, location, debug }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const dragHandleRef = useRef<HTMLButtonElement>(null);

    const { model } = useBoard(BOARD_ITEM_NAME);
    const column = useBoardColumn();
    const items = useMemo(
      () =>
        column != null && model.onItemDelete
          ? [
              createMenuAction('delete-item', () => model.onItemDelete?.(column, data), {
                label: t('delete menu label'),
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
          dragHandle={dragHandleRef.current}
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
              <Card.Toolbar>
                <Card.DragHandle ref={dragHandleRef} testId='mosaicBoard.cardDragHandle' />
                <Card.Title data-testid='mosaicBoard.cardTitle'>{label}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Menu.Trigger asChild disabled={!items?.length}>
                  <Toolbar.IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action menu label')}
                  />
                </Menu.Trigger>
                <Menu.Content items={items} />
              </Card.Toolbar>
              {/* TODO(burdon): Replace with surface. */}
              <Card.Row icon='ph--note--regular' classNames='text-description'>
                <Card.Text>{description}</Card.Text>
              </Card.Row>
              <Card.Row icon='ph--tag--regular'>
                {label && (
                  <div role='none' className='shrink-0 flex gap-1 items-center text-xs'>
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
