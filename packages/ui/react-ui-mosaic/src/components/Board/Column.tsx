//
// Copyright 2023 DXOS.org
//

import React, {
  type PropsWithChildren,
  type ReactElement,
  type Ref as ReactRef,
  forwardRef,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { translationKey } from '../../translations';
import { Card, type CardMenuProps } from '../Card';
import { Focus } from '../Focus';
import { Mosaic, type MosaicContainerProps, type MosaicTileProps } from '../Mosaic';
import { type StackProps } from '../Stack';

import { useBoardContext } from './Board';
import { BoardItem } from './Item';

//
// Column
//

const BOARD_COLUMN_NAME = 'Board.Column';

type BoardColumnProps<TColumn extends Obj.Unknown = any> = Pick<
  MosaicTileProps<TColumn>,
  'classNames' | 'location' | 'data' | 'debug'
> & {
  Tile?: StackProps<Ref.Ref<Obj.Unknown>>['Tile'];
};

const BoardColumnRootInner = forwardRef<HTMLDivElement, PropsWithChildren<BoardColumnProps>>(
  ({ classNames, children, location, data, debug }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { model } = useBoardContext(BOARD_COLUMN_NAME);
    const dragHandleRef = useRef<HTMLButtonElement>(null);

    // Context menu.
    const menuItems = useMemo<NonNullable<CardMenuProps<Obj.Unknown>['items']>>(
      () =>
        [
          model.onDeleteItem && {
            label: t('delete menu label'),
            onClick: (obj: Obj.Unknown) => {
              model.onDeleteItem?.(data, obj);
            },
          },
        ].filter(isNonNullable),
      [model.onDeleteItem],
    );

    return (
      <Card.Context value={{ menuItems }}>
        <Mosaic.Tile
          asChild
          dragHandle={dragHandleRef.current}
          location={location}
          id={data.id}
          data={data}
          debug={debug}
        >
          <Focus.Group
            asChild
            // NOTE: Width reserves 2px for outer Focus.Group border.
            classNames='grid bs-full is-[calc(100vw-2px)] md:is-card-default-width snap-center bg-deckSurface'
          >
            <div role='none' className={mx(classNames)} ref={forwardedRef}>
              {children}
            </div>
          </Focus.Group>
        </Mosaic.Tile>
      </Card.Context>
    );
  },
);

BoardColumnRootInner.displayName = BOARD_COLUMN_NAME;

const BoardColumnRoot = BoardColumnRootInner as <TColumn extends Obj.Unknown = any>(
  props: BoardColumnProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// ColumnHeader
//

const BOARD_COLUMN_HEADER_NAME = 'Board.ColumnHeader';

type BoardColumnHeaderProps = ThemedClassName<{ label: string }>;

const BoardColumnHeader = forwardRef<HTMLButtonElement, BoardColumnHeaderProps>(
  ({ classNames, label }, forwardedRef) => {
    return (
      <Card.Toolbar classNames={classNames}>
        <Card.DragHandle ref={forwardedRef} />
        <Card.Title>{label}</Card.Title>
        <Card.Menu items={[]} />
      </Card.Toolbar>
    );
  },
);

BoardColumnHeader.displayName = BOARD_COLUMN_HEADER_NAME;

//
// ColumnBody
//

const BOARD_COLUMN_BODY_NAME = 'Board.ColumnBody';

type BoardColumnBodyProps = Pick<BoardColumnProps, 'data' | 'Tile'> & Pick<MosaicContainerProps, 'debug'>;

const BoardColumnBody = ({ data, Tile = BoardItem, debug }: BoardColumnBodyProps) => {
  const { model } = useBoardContext(BOARD_COLUMN_NAME);
  const [column, updateColumn] = useObject(data);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const eventHandler = useEventHandlerAdapter<Ref.Unknown>({
    id: data.id,
    items: model.getItems(column),
    getId: (data) => data.dxn.toString(),
    get: (data) => data.target!,
    make: (object) => Ref.make(object),
    canDrop: ({ source }) => (source.data.target ? model.isItem(source.data.target) : false),
    onChange: (mutator) => updateColumn((column) => mutator(model.getItems(column))),
  });

  return (
    <Mosaic.Container
      asChild
      withFocus
      orientation='vertical'
      autoScroll={viewport}
      eventHandler={eventHandler}
      debug={debug}
    >
      <ScrollArea.Root orientation='vertical' thin padding>
        <ScrollArea.Viewport classNames='snap-y md:snap-none' ref={setViewport}>
          <Mosaic.Stack items={model.getItems(column)} getId={(data) => data.dxn.toString()} Tile={Tile} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Mosaic.Container>
  );
};

BoardColumnBody.displayName = BOARD_COLUMN_BODY_NAME;

//
// DefaultBoardColumn
//

const DefaultBoardColumn = forwardRef<HTMLDivElement, BoardColumnProps>(
  ({ classNames, location, data, debug, Tile = BoardItem }, forwardedRef) => {
    const { model } = useBoardContext(BOARD_COLUMN_NAME);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);

    return (
      <BoardColumnRootInner
        ref={forwardedRef}
        classNames={mx(debug ? 'grid-rows-[min-content_1fr_20rem]' : 'grid-rows-[min-content_1fr]', classNames)}
        location={location}
        data={data}
      >
        <BoardColumnHeader label={data.id} ref={dragHandleRef} />
        <BoardColumnBody data={data} Tile={Tile} debug={debugHandler} />
        {debug && (
          <div role='none' className='border-bs border-separator'>
            <div className='grow flex p-1 justify-center text-xs'>{model.getItems(data).length}</div>
            <DebugInfo />
          </div>
        )}
      </BoardColumnRootInner>
    );
  },
);

//
// BoardColumn
//

const BoardColumn = {
  Root: BoardColumnRoot,
  Header: BoardColumnHeader,
  Body: BoardColumnBody,
};

export { BoardColumn, DefaultBoardColumn, type BoardColumnProps };
