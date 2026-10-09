//
// Copyright 2023 DXOS.org
//

import React, { type ReactElement, type Ref as ReactRef, forwardRef, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useComposedRefs } from '@dxos/react-hooks';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as DragHandle from '@dxos/react-ui/DragHandle';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { getHashStyles } from '@dxos/ui-theme';

import { translationKey } from '#translations';

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
    const { t } = Hooks.useTranslation(translationKey);
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
          <Card.Root
            classNames={classNames}
            data-testid='board-item'
            ref={composedRef}
            onClick={(event) => event.currentTarget.focus()}
          >
            <Card.Header>
              <DragHandle.DragHandle ref={setDragHandle} data-testid='mosaicBoard.cardDragHandle' />
              <Card.Title data-testid='mosaicBoard.cardTitle'>{label}</Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Layout.Block rail='end'>
                <ActionMenu disabled={!items?.length} actions={items}>
                  <Button.Root
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label={t('action-menu.label')}
                  />
                </ActionMenu>
              </Layout.Block>
            </Card.Header>
            {/* TODO(burdon): Replace with surface. */}
            <Card.Row classNames='text-fg-muted'>
              <Layout.Block>
                <Icon.Icon icon='ph--note--regular' />
              </Layout.Block>
              <Card.Text>{description}</Card.Text>
            </Card.Row>
            <Card.Row>
              <Layout.Block>
                <Icon.Icon icon='ph--tag--regular' />
              </Layout.Block>
              {label && (
                <div className='shrink-0 flex gap-1 items-center text-xs'>
                  <Tag.Tag hue={getHashStyles(label).hue}>{label}</Tag.Tag>
                </div>
              )}
            </Card.Row>
          </Card.Root>
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
