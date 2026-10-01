//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, {
  type PropsWithChildren,
  type ReactElement,
  type Ref as ReactRef,
  forwardRef,
  useMemo,
  useState,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu/next';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useContainerDebug, useEventHandlerAdapter } from '../../hooks/index.ts';
import { Focus } from '../Focus/index.ts';
import { Mosaic, type MosaicContainerProps, type MosaicStackProps, type MosaicTileProps } from '../Mosaic/index.ts';
import { BoardColumnProvider, useBoardColumn } from './BoardColumnContext.ts';
import { useBoard } from './BoardContext.ts';
import { BoardItem } from './Item.tsx';

type BoardColumnProps<TColumn = any> = Pick<
  MosaicTileProps<TColumn>,
  'classNames' | 'location' | 'data' | 'debug' | 'draggable'
>;

//
// Column Root
//

const BOARD_COLUMN_ROOT_NAME = 'Board.Column.Root';

type BoardColumnRootProps<TColumn = any> = PropsWithChildren<BoardColumnProps<TColumn>> & {
  // Pass the actual button element (not a ref). Refs don't trigger re-renders, so reading
  // `ref.current` at render time leaves Mosaic.Tile's `dragHandle` prop null forever.
  // Consumers should track this with `useState` and a callback ref on `Board.Column.Header`.
  dragHandle?: HTMLButtonElement | null;
};

const BoardColumnRootInner = composable<HTMLDivElement, BoardColumnRootProps>(
  ({ classNames, children, location, data, debug, draggable, dragHandle, ...rest }, forwardedRef) => {
    const { model } = useBoard(BOARD_COLUMN_ROOT_NAME);

    return (
      <Mosaic.Tile
        asChild
        location={location}
        id={model.getColumnId(data)}
        data={data}
        debug={debug}
        draggable={draggable}
        dragHandle={dragHandle}
      >
        <Focus.Group
          {...rest}
          data-testid='board-column'
          border
          classNames={mx(
            'group/column',
            'dx-fill md:w-card-default-width snap-center dx-deck-surface',
            'overflow-hidden',
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

type BoardColumnHeaderProps = { label: string; dragHandleRef: ReactRef<HTMLButtonElement> };

const BoardColumnHeader = composable<HTMLDivElement, BoardColumnHeaderProps>(
  ({ label, dragHandleRef, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { model } = useBoard(BOARD_COLUMN_HEADER_NAME);
    const column = useBoardColumn();
    const columnMenuItems = useMemo(
      () =>
        column != null && model.onColumnDelete
          ? [
              createMenuAction('delete-column', () => model.onColumnDelete?.(column), {
                label: t('delete-menu.label'),
                icon: 'ph--trash--regular',
              }),
            ]
          : [],
      [column, model.onColumnDelete, t],
    );

    return (
      <>
        {/* TODO(burdon): Use Card.Header. */}
        <Next.Toolbar.Root
          {...composableProps(props, { classNames: 'gap-0' })}
          data-testid='board-column-header'
          ref={forwardedRef}
        >
          <Next.DragHandle ref={dragHandleRef} data-testid='mosaicBoard.columnDragHandle' />
          <Next.Toolbar.Text classNames='grow px-0' data-testid='mosaicBoard.columnTitle'>
            {label}
          </Next.Toolbar.Text>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <ActionMenu disabled={!columnMenuItems?.length} actions={columnMenuItems}>
            <Next.Button
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('action-menu.label')}
            />
          </ActionMenu>
        </Next.Toolbar.Root>
      </>
    );
  },
);

BoardColumnHeader.displayName = BOARD_COLUMN_HEADER_NAME;

//
// Column Body
//

const BOARD_COLUMN_BODY_NAME = 'Board.Column.Body';

type BoardColumnBodyProps = Pick<BoardColumnProps, 'data'> &
  Pick<MosaicContainerProps, 'eventHandler' | 'debug'> & {
    Tile?: MosaicStackProps<Obj.Unknown>['Tile'];
  };

const BoardColumnBody = composable<HTMLDivElement, BoardColumnBodyProps>(
  ({ data, eventHandler, Tile = BoardItem, debug, ...props }, forwardedRef) => {
    const { model } = useBoard(BOARD_COLUMN_BODY_NAME);
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useAtomValue(model.items(data));

    return (
      <Mosaic.Container
        {...composableProps(props)}
        asChild
        withFocus
        orientation='vertical'
        autoScroll={viewport}
        eventHandler={eventHandler}
        debug={debug}
        ref={forwardedRef}
      >
        <Next.ScrollArea.Root orientation='vertical'>
          <Next.ScrollArea.Viewport classNames='snap-y md:snap-none' ref={setViewport}>
            <Mosaic.Stack items={items} getId={model.getItemId} Tile={Tile} />
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
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
      <Next.Toolbar.Root classNames={mx('rounded-b-sm border-t border-separator', classNames)} ref={forwardedRef}>
        {handleAdd && (
          <Next.Button
            data-testid='board-column-add-item'
            classNames='group-hover/column:opacity-100 md:opacity-0 transition transition-opacity duration-500'
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label={t('add-item.label')}
            onClick={handleAdd}
          />
        )}
      </Next.Toolbar.Root>
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
  ({ classNames, location, data, debug, draggable, Tile = BoardItem }, forwardedRef) => {
    const { model } = useBoard(BOARD_DEFAULT_COLUMN_NAME);
    const [DebugInfo, debugHandler] = useContainerDebug(debug);
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
    const [column, updateColumn] = useObject(data);

    const eventHandler = useEventHandlerAdapter<Ref.Unknown>({
      id: model.getColumnId(data),
      items: column?.items ?? [],
      getId: (ref) => ref.target?.id ?? ref.uri,
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
        draggable={draggable}
        dragHandle={dragHandle}
        ref={forwardedRef}
      >
        <BoardColumnHeader label={Obj.getLabel(data) ?? data.id} dragHandleRef={setDragHandle} />
        <BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler} Tile={Tile} />
        <div className='flex flex-col col-span-full'>
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
