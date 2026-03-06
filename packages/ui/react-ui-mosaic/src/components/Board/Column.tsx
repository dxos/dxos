//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
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
import {
  type CardMenuProps,
  IconButton,
  ScrollArea,
  type ThemedClassName,
  Toolbar,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { translationKey } from '../../translations';
import { Focus } from '../Focus';
import { Mosaic, type MosaicContainerProps, type MosaicStackProps, type MosaicTileProps } from '../Mosaic';

import { useBoard } from './Board';
import { BoardItem } from './Item';

//
// Column
//

const BOARD_COLUMN_NAME = 'Board.Column';

type BoardColumnProps<TColumn = any> = Pick<MosaicTileProps<TColumn>, 'classNames' | 'location' | 'data' | 'debug'>;

type BoardColumnRootInnerProps<TColumn = any> = BoardColumnProps<TColumn> & {
  dragHandleRef: RefObject<HTMLButtonElement | null>;
  [key: string]: any;
};

const BoardColumnRootInner = forwardRef<HTMLDivElement, PropsWithChildren<BoardColumnRootInnerProps>>(
  ({ classNames, children, location, data, debug, dragHandleRef, ...rest }, forwardedRef) => {
    const { model } = useBoard(BOARD_COLUMN_NAME);
    return (
      <Mosaic.Tile
        asChild
        location={location}
        id={model.getColumnId(data)}
        data={data}
        debug={debug}
        dragHandle={dragHandleRef.current}
      >
        <Focus.Group
          {...rest}
          classNames={mx(
            // NOTE: Reserves 2px for outer Focus.Group border.
            'h-full overflow-hidden w-[calc(100vw-2px)] md:w-card-default-width snap-center bg-deck-surface',
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

type BoardColumnRootProps<TColumn = any> = PropsWithChildren<BoardColumnProps<TColumn>> & {
  dragHandleRef?: RefObject<HTMLButtonElement | null>;
};

const BoardColumnRootImpl = forwardRef<HTMLDivElement, BoardColumnRootProps>(
  ({ classNames, dragHandleRef: dragHandleRefProp, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const dragHandleRef = dragHandleRefProp ?? internalRef;
    return (
      <BoardColumnRootInner
        {...props}
        data-testid='board-column'
        classNames={mx('group/column', classNames)}
        dragHandleRef={dragHandleRef}
        ref={forwardedRef}
      />
    );
  },
);

BoardColumnRootImpl.displayName = 'Board.Column.Root';

const BoardColumnRoot = BoardColumnRootImpl as <TColumn = any>(
  props: BoardColumnRootProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Column Header
//

const BOARD_COLUMN_HEADER_NAME = 'Board.Column.Header';

type BoardColumnHeaderProps = ThemedClassName<{ label: string; dragHandleRef: ReactRef<HTMLButtonElement> }>;

const BoardColumnHeader = forwardRef<HTMLDivElement, BoardColumnHeaderProps>(
  ({ classNames, label, dragHandleRef }, forwardedRef) => {
    return (
      <Toolbar.Root
        classNames={mx('border-b border-separator', classNames)}
        data-testid='board-column-header'
        ref={forwardedRef}
      >
        <Toolbar.DragHandle ref={dragHandleRef} />
        <Toolbar.Text>{label}</Toolbar.Text>
        <Toolbar.Menu items={[]} />
      </Toolbar.Root>
    );
  },
);

BoardColumnHeader.displayName = BOARD_COLUMN_HEADER_NAME;

//
// Column Body
//

const BOARD_COLUMN_BODY_NAME = 'Board.Column.Body';

type BoardColumnBodyProps = Pick<BoardColumnProps, 'data'> & {
  eventHandler?: MosaicContainerProps['eventHandler'];
  Tile?: MosaicStackProps<Obj.Unknown>['Tile'];
  debug?: MosaicContainerProps['debug'];
};

const BoardColumnBody = ({ data, eventHandler, Tile = BoardItem, debug }: BoardColumnBodyProps) => {
  const { t } = useTranslation(translationKey);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const { model } = useBoard(BOARD_COLUMN_BODY_NAME);
  const items = useAtomValue(model.items(data));

  // TODO(burdon): Add to menu context.
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
    <Mosaic.Container
      asChild
      withFocus
      orientation='vertical'
      autoScroll={viewport}
      eventHandler={eventHandler}
      debug={debug}
    >
      <ScrollArea.Root orientation='vertical' thin margin padding>
        <ScrollArea.Viewport classNames='snap-y md:snap-none' ref={setViewport}>
          <Mosaic.Stack items={items} getId={model.getItemId} Tile={Tile} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Mosaic.Container>
  );
};

BoardColumnBody.displayName = BOARD_COLUMN_BODY_NAME;

//
// Column Footer
//

const BOARD_COLUMN_FOOTER_NAME = 'Board.Column.Footer';

type BoardColumnFooterProps = ThemedClassName & {
  data?: any;
  onAdd?: () => void;
};

const BoardColumnFooter = forwardRef<HTMLDivElement, BoardColumnFooterProps>(
  ({ classNames, data, onAdd }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { model } = useBoard(BOARD_COLUMN_FOOTER_NAME);

    const handleAdd = onAdd ?? (model.onItemCreate && data ? () => void model.onItemCreate?.(data) : undefined);

    return (
      <Toolbar.Root classNames={mx('rounded-b-sm border-t border-separator', classNames)} ref={forwardedRef}>
        {handleAdd && (
          <IconButton
            data-testid='board-column-add-item'
            classNames='group-hover/column:opacity-100 md:opacity-0 transition transition-opacity duration-500'
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label={t('add item label')}
            onClick={handleAdd}
          />
        )}
      </Toolbar.Root>
    );
  },
);

BoardColumnFooter.displayName = BOARD_COLUMN_FOOTER_NAME;

//
// DefaultBoardColumn
//

const BOARD_DEFAULT_COLUMN_NAME = 'Board.DefaultColumn';

type DefaultBoardColumnProps = BoardColumnProps & Pick<BoardColumnBodyProps, 'Tile'>;

const DefaultBoardColumn = forwardRef<HTMLDivElement, DefaultBoardColumnProps>(
  ({ classNames, location, data, debug, Tile = BoardItem }, forwardedRef) => {
    const { model } = useBoard(BOARD_DEFAULT_COLUMN_NAME);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const [column, updateColumn] = useObject(data);

    const eventHandler = useEventHandlerAdapter<Ref.Unknown>({
      id: model.getColumnId(data),
      items: column?.items ?? [],
      getId: (ref) => ref.target?.id ?? ref.dxn.toString(),
      get: (refOrObj) => (Ref.isRef(refOrObj) ? refOrObj.target! : refOrObj),
      make: (object) => Ref.make(object),
      canDrop: ({ source }) => {
        const item = Ref.isRef(source.data) ? source.data.target : source.data;
        return item != null && Obj.isObject(item) && model.isItem(item);
      },
      onChange: (mutator) => updateColumn((col) => mutator(col.items)),
    });

    return (
      <BoardColumnRootInner
        classNames={mx(
          'group/column grid',
          debug
            ? 'grid-rows-[var(--dx-rail-action)_1fr_20rem]'
            : 'grid-rows-[var(--dx-rail-action)_1fr_var(--dx-rail-action)]',
          classNames,
        )}
        location={location}
        data={data}
        dragHandleRef={dragHandleRef}
        ref={forwardedRef}
      >
        <BoardColumnHeader label={Obj.getLabel(data) ?? data.id} dragHandleRef={dragHandleRef} />
        <BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler} Tile={Tile} />
        <div role='none' className='flex flex-col col-span-full'>
          <BoardColumnFooter data={data} />
          <DebugInfo />
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
  Footer: BoardColumnFooter,
};

export { BoardColumn, DefaultBoardColumn, type BoardColumnProps };
