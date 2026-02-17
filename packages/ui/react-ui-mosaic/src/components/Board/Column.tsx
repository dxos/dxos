//
// Copyright 2023 DXOS.org
//

import React, {
  type PropsWithChildren,
  type ReactElement,
  type Ref as ReactRef,
  type RefObject,
  forwardRef,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, ScrollArea, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
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
>;

type BoardColumnRootInnerProps<TColumn extends Obj.Unknown = any> = BoardColumnProps<TColumn> & {
  dragHandleRef: RefObject<HTMLButtonElement | null>;
};

const BoardColumnRootInner = forwardRef<HTMLDivElement, PropsWithChildren<BoardColumnRootInnerProps>>(
  ({ classNames, children, location, data, debug, dragHandleRef }, forwardedRef) => {
    return (
      <Mosaic.Tile
        asChild
        dragHandle={dragHandleRef.current}
        location={location}
        id={data.id}
        data={data}
        debug={debug}
      >
        <Focus.Group
          // NOTE: Width reserves 2px for outer Focus.Group border.
          classNames={mx(
            'bs-full overflow-hidden is-[calc(100vw-2px)] md:is-card-default-width snap-center bg-deckSurface',
            classNames,
          )}
          ref={forwardedRef}
        >
          {children}
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

BoardColumnRootInner.displayName = BOARD_COLUMN_NAME;

const BoardColumnRootImpl = forwardRef<HTMLDivElement, BoardColumnProps>((props, forwardedRef) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  return <BoardColumnRootInner {...props} dragHandleRef={dragHandleRef} ref={forwardedRef} />;
});

BoardColumnRootImpl.displayName = 'Board.Column.Root';

const BoardColumnRoot = BoardColumnRootImpl as <TColumn extends Obj.Unknown = any>(
  props: BoardColumnProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// ColumnHeader
//

const BOARD_COLUMN_HEADER_NAME = 'Board.Column.Header';

type BoardColumnHeaderProps = ThemedClassName<{ label: string; dragHandleRef: ReactRef<HTMLButtonElement> }>;

const BoardColumnHeader = forwardRef<HTMLDivElement, BoardColumnHeaderProps>(
  ({ classNames, label, dragHandleRef }, forwardedRef) => {
    return (
      <Card.Toolbar classNames={classNames} ref={forwardedRef}>
        <Card.DragHandle ref={dragHandleRef} />
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

const BOARD_COLUMN_BODY_NAME = 'Board.Column.Body';

type BoardColumnBodyProps = Pick<BoardColumnProps, 'data'> & {
  Tile?: StackProps<Ref.Ref<Obj.Unknown>>['Tile']; // TODO(burdon): GENERALIZE VIA MODEL.
} & Pick<MosaicContainerProps, 'debug'>;

const BoardColumnBody = ({ data, Tile = BoardItem, debug }: BoardColumnBodyProps) => {
  const { t } = useTranslation(translationKey);
  const { model } = useBoardContext(BOARD_COLUMN_BODY_NAME);
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

  // Context menu for items.
  const menuItems = useMemo<NonNullable<CardMenuProps<Obj.Unknown>['items']>>(
    () =>
      [
        model.onItemDelete && {
          label: t('delete menu label'),
          onClick: (obj: Obj.Unknown) => {
            model.onItemDelete?.(data, obj);
          },
        },
      ].filter(isNonNullable),
    [model.onItemDelete, data, t],
  );

  return (
    <Card.Context value={{ menuItems }}>
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
    </Card.Context>
  );
};

BoardColumnBody.displayName = BOARD_COLUMN_BODY_NAME;

//
// ColumnFooter
//

const BOARD_COLUMN_FOOTER_NAME = 'Board.Column.Footer';

type BoardColumnFooterProps = ThemedClassName;

const BoardColumnFooter = forwardRef<HTMLDivElement, BoardColumnFooterProps>(({ classNames }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { model } = useBoardContext(BOARD_COLUMN_FOOTER_NAME);

  return (
    <Toolbar.Root classNames={mx('rounded-b-sm', classNames)} ref={forwardedRef}>
      {model.onItemCreate && (
        <IconButton
          classNames='group-hover/column:opacity-100 opacity-0 transition transition-opacity duration-500'
          variant='ghost'
          icon='ph--plus--regular'
          iconOnly
          label={t('add item label')}
        />
      )}
    </Toolbar.Root>
  );
});

BoardColumnFooter.displayName = BOARD_COLUMN_FOOTER_NAME;

//
// DefaultBoardColumn
//

const BOARD_DEFAULT_COLUMN_NAME = 'Board.DefaultColumn';

type DefaultBoardColumnProps = BoardColumnProps & Pick<BoardColumnBodyProps, 'Tile'>;

const DefaultBoardColumn = forwardRef<HTMLDivElement, DefaultBoardColumnProps>(
  ({ classNames, location, data, debug, Tile = BoardItem }, forwardedRef) => {
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);

    return (
      <BoardColumnRootInner location={location} data={data} dragHandleRef={dragHandleRef} ref={forwardedRef}>
        <div
          role='none'
          className={mx(
            'group/column grid bs-full overflow-hidden',
            debug
              ? 'grid-rows-[var(--rail-action)_1fr_20rem]'
              : 'grid-rows-[var(--rail-action)_1fr_var(--rail-action)]',
            classNames,
          )}
        >
          <BoardColumnHeader
            classNames='border-be border-separator'
            label={Obj.getLabel(data) ?? data.id}
            dragHandleRef={dragHandleRef}
          />
          <BoardColumnBody data={data} debug={debugHandler} Tile={Tile} />
          <div role='none' className='flex flex-col'>
            <BoardColumnFooter classNames='border-bs border-separator' />
            <DebugInfo />
          </div>
        </div>
      </BoardColumnRootInner>
    );
  },
);

DefaultBoardColumn.displayName = BOARD_DEFAULT_COLUMN_NAME;

//
// BoardColumn
//

const BoardColumn = {
  Root: BoardColumnRoot,
  Header: BoardColumnHeader,
  Body: BoardColumnBody,
};

export { BoardColumn, DefaultBoardColumn, type BoardColumnProps };
