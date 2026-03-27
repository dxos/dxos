//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
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
import { ComposableProps, IconButton, ScrollArea, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { composableProps, mx } from '@dxos/ui-theme';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks';
import { translationKey } from '../../translations';
import { Focus } from '../Focus';
import { Mosaic, type MosaicContainerProps, type MosaicStackProps, type MosaicTileProps } from '../Mosaic';

import { useBoard } from './Board';
import { BoardItem } from './Item';

//
// Column context
//

const BOARD_COLUMN_CONTEXT_NAME = 'Board.Column';

export type BoardColumnContextValue<TColumn = unknown> = {
  column: TColumn;
};

const [BoardColumnProvider, useBoardColumnContext] = createContext<BoardColumnContextValue | null>(
  BOARD_COLUMN_CONTEXT_NAME,
  null,
);

/** Returns the current column when rendered inside a board column (e.g., in column header or item tile). */
export function useBoardColumn<TColumn = unknown>(): TColumn | undefined {
  const value = useBoardColumnContext(BOARD_COLUMN_CONTEXT_NAME);
  return value?.column as TColumn | undefined;
}

type BoardColumnProps<TColumn = any> = Pick<MosaicTileProps<TColumn>, 'classNames' | 'location' | 'data' | 'debug'>;

//
// Column Root
//

const BOARD_COLUMN_ROOT_NAME = 'Board.Column.Root';

type BoardColumnRootProps<TColumn = any> = PropsWithChildren<BoardColumnProps<TColumn>> & {
  dragHandleRef?: RefObject<HTMLButtonElement | null>;
};

const BoardColumnRootInner = forwardRef<HTMLDivElement, BoardColumnRootProps>(
  ({ classNames, children, location, data, debug, dragHandleRef: dragHandleRefProp, ...rest }, forwardedRef) => {
    const { model } = useBoard(BOARD_COLUMN_ROOT_NAME);

    // TODO(burdon): Use merge ref hook (see react-hooks).
    const internalRef = useRef<HTMLButtonElement>(null);
    const dragHandleRef = dragHandleRefProp ?? internalRef;

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
          data-testid='board-column'
          classNames={mx(
            // NOTE: Reserves 2px for outer Focus.Group border.
            'group/column h-full overflow-hidden w-[calc(100vw-2px)] md:w-card-default-width snap-center bg-deck-surface',
            classNames,
          )}
          ref={forwardedRef}
        >
          <BoardColumnProvider column={data}>{children}</BoardColumnProvider>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

BoardColumnRootInner.displayName = BOARD_COLUMN_ROOT_NAME;

const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(
  props: BoardColumnRootProps<TColumn> & { ref?: ReactRef<HTMLDivElement> },
) => ReactElement;

//
// Column Header
//

const BOARD_COLUMN_HEADER_NAME = 'Board.Column.Header';

type BoardColumnHeaderProps = ComposableProps<
  HTMLDivElement,
  { label: string; dragHandleRef: ReactRef<HTMLButtonElement> }
>;

const BoardColumnHeader = forwardRef<HTMLDivElement, BoardColumnHeaderProps>(
  ({ label, dragHandleRef, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { model } = useBoard(BOARD_COLUMN_HEADER_NAME);
    const column = useBoardColumn();
    const { className, ...rest } = composableProps(props);
    const columnMenuItems = useMemo(
      () =>
        column != null && model.onColumnDelete
          ? [
              createMenuAction('delete-column', () => model.onColumnDelete?.(column), {
                label: t('delete menu label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : [],
      [column, model.onColumnDelete, t],
    );

    return (
      <Menu.Root>
        <Toolbar.Root
          {...rest}
          className={mx('border-b border-separator', className)}
          data-testid='board-column-header'
          ref={forwardedRef}
        >
          <Toolbar.DragHandle ref={dragHandleRef} testId='mosaicBoard.columnDragHandle' />
          <Toolbar.Text data-testid='mosaicBoard.columnTitle'>{label}</Toolbar.Text>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <Menu.Trigger asChild disabled={!columnMenuItems?.length}>
            <Toolbar.IconButton
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('action menu label')}
            />
          </Menu.Trigger>
          <Menu.Content items={columnMenuItems} />
        </Toolbar.Root>
      </Menu.Root>
    );
  },
);

BoardColumnHeader.displayName = BOARD_COLUMN_HEADER_NAME;

//
// Column Body
//

const BOARD_COLUMN_BODY_NAME = 'Board.Column.Body';

type BoardColumnBodyProps = ComposableProps<
  HTMLDivElement,
  Pick<BoardColumnProps, 'data'> &
    Pick<MosaicContainerProps, 'eventHandler' | 'debug'> & {
      Tile?: MosaicStackProps<Obj.Unknown>['Tile'];
    }
>;

const BoardColumnBody = forwardRef<HTMLDivElement, BoardColumnBodyProps>(
  ({ data, eventHandler, Tile = BoardItem, debug, ...props }, forwardedRef) => {
    const { model } = useBoard(BOARD_COLUMN_BODY_NAME);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useAtomValue(model.items(data));

    return (
      <Mosaic.Container
        asChild
        withFocus
        orientation='vertical'
        autoScroll={viewport}
        eventHandler={eventHandler}
        debug={debug}
      >
        <ScrollArea.Root {...composableProps(props)} orientation='vertical' thin margin padding ref={forwardedRef}>
          <ScrollArea.Viewport classNames='snap-y md:snap-none' ref={setViewport}>
            <Mosaic.Stack items={items} getId={model.getItemId} Tile={Tile} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    );
  },
);

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

export const BoardColumn = {
  Root: BoardColumnRoot,
  Header: BoardColumnHeader,
  Body: BoardColumnBody,
  Footer: BoardColumnFooter,
};

export { DefaultBoardColumn };

export { type BoardColumnProps };
