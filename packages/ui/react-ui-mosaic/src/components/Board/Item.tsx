//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { Tag, useTranslation } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { getHashStyles } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Card } from '../Card';
import { Focus } from '../Focus';
import { Mosaic, type MosaicTileProps } from '../Mosaic';

import { useBoard } from './Board';
import { useBoardColumn } from './Column';

//
// Item
//

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
      <Mosaic.Tile
        asChild
        dragHandle={dragHandleRef.current}
        id={data.id}
        data={data}
        location={location}
        debug={debug}
      >
        <Focus.Group asChild>
          <Card.Root
            classNames={classNames}
            data-testid='board-item'
            onClick={() => rootRef.current?.focus()}
            ref={composedRef}
          >
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Title>{label}</Card.Title>
              <Card.Menu items={items} />
            </Card.Toolbar>
            {/* TODO(burdon): Replace with surface. */}
            <Card.Row icon='ph--note--regular' classNames='text-description'>
              {description}
            </Card.Row>
            <Card.Row icon='ph--tag--regular'>
              {label && (
                <div role='none' className='shrink-0 flex gap-1 items-center text-xs'>
                  <Tag palette={getHashStyles(label).hue}>{label}</Tag>
                </div>
              )}
            </Card.Row>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

BoardItemInner.displayName = BOARD_ITEM_NAME;

const BoardItem = BoardItemInner as <TItem extends Obj.Unknown = any>(
  props: BoardItemProps<TItem> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

export { BoardItem, type BoardItemProps };
