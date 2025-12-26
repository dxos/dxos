//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { useArrowNavigationGroup, useFocusFinders, useFocusableGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import React, {
  type CSSProperties,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  type Ref,
  type SetStateAction,
  forwardRef,
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { findFirstFocusableAncestor } from './focusable';

const borderClasses =
  'outline-none transition border border-subduedSeparator focus:border-primary-500 focus-within:border-separator rounded-sm';
const iconClasses = 'pbs-0.5 hover:bg-inputSurface rounded-sm transition opacity-10 group-hover:opacity-100';

//
// Context
//

type GridContextValue = {
  selection: Set<string>;
  setSelection: Dispatch<SetStateAction<Set<string>>>;
};

const [GridContextProvider, _useGridContext] = createContext<GridContextValue>('Grid');

//
// Root
//

type GridRootProps = PropsWithChildren<{}>;

const GridRoot = ({ children }: GridRootProps) => {
  const [selection, setSelection] = useState<Set<string>>(new Set());

  return (
    <GridContextProvider selection={selection} setSelection={setSelection}>
      {children}
    </GridContextProvider>
  );
};

GridRoot.displayName = 'Grid.Root';

//
// Viewport
//

interface GridEventHandler {
  onCellMove?: (props: { from: number; to: number }) => void;
}

type GridViewportProps = ThemedClassName<PropsWithChildren<{}>> & GridEventHandler;

const GridViewport = ({ classNames, children, onCellMove }: GridViewportProps) => {
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'horizontal', memorizeCurrent: true });
  const rootRef = useRef<HTMLDivElement>(null);

  // Handle all mutation events.
  useEffect(() => {
    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          const column = location.current.dropTargets.find((t) => t.data.type === 'column');
          const cell = location.current.dropTargets.find((t) => t.data.type === 'cell');
          if (!column || !cell) {
            return;
          }

          const items = column.data.items as Obj.Any[];
          const from = items.findIndex((item) => item.id === source.data.itemId);
          const to = items.findIndex((item) => item.id === cell.data.itemId);
          log('cellMove', { from, to });
          onCellMove?.({ from, to });
        },
      }),
    );
  }, [rootRef]);

  return (
    <div
      ref={rootRef}
      role='none'
      className={mx('flex bs-full is-full overflow-x-auto p-2 gap-2', classNames)}
      {...arrowNavigationAttrs}
    >
      {children}
    </div>
  );
};

GridViewport.displayName = 'Grid.Viewport';

//
// Column
//

type GridColumnProps = ThemedClassName<PropsWithChildren<{}>>;

const GridColumn = memo(({ classNames, children }: GridColumnProps) => {
  return (
    <div role='none' className={mx('relative flex flex-col is-full', borderClasses, classNames)}>
      {children}
    </div>
  );
});

GridColumn.displayName = 'Grid.Column';

//
// Stack
// Ref: https://codesandbox.io/p/sandbox/vc6s5t?file=%2Fpragmatic-drag-and-drop%2Fdocumentation%2Fexamples%2Fpieces%2Fboard%2Fcolumn.tsx
//

type GridStackProps = ThemedClassName<
  {
    items: Obj.Any[];
  } & Pick<GridCellProps, 'Cell'>
>;

const GridStack = memo(({ classNames, items, Cell }: GridStackProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusableGroupAttrs = useFocusableGroup();
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
  const { findFirstFocusable } = useFocusFinders();

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    return combine(
      dropTargetForElements({
        element: rootRef.current,
        getData: () => ({ type: 'column', items }),
      }),
      autoScrollForElements({
        element: rootRef.current,
      }),
    );
  }, [rootRef]);

  return (
    <div
      ref={rootRef}
      role='none'
      className={mx('relative flex flex-col is-full plb-2 overflow-y-auto', classNames)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget) {
          switch (event.key) {
            case 'Enter':
              rootRef.current && findFirstFocusable(rootRef.current)?.focus();
              break;
          }
        }
      }}
      {...focusableGroupAttrs}
      {...arrowNavigationAttrs}
    >
      {items.map((item) => (
        <Grid.Cell key={item.id} item={item} Cell={Cell} />
      ))}
    </div>
  );
});

GridStack.displayName = 'Grid.Column';

//
// Cell
//

type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect: DOMRect } | { type: 'dragging' };

type GridCellProps = ThemedClassName<{
  item: Obj.Any;
  Cell: FC<{ item: Obj.Any; dragging?: boolean }>;
}>;

const GridCell = memo(({ classNames, item, Cell }: GridCellProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ type: 'idle' });
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    if (!rootRef.current || !handleRef.current) {
      return;
    }

    const root = rootRef.current;
    const handle = handleRef.current;

    return combine(
      draggable({
        element: handle,
        getInitialData: () => ({ type: 'cell', itemId: item.id }),
        onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
          const rect = root.getBoundingClientRect();
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: root,
              input: location.current.input,
            }),
            render: ({ container }) => {
              setState({ type: 'preview', container, rect });
              return () => setState({ type: 'dragging' });
            },
          });
        },
        onDragStart: () => {
          setState({ type: 'dragging' });
        },
        onDrop: () => {
          setState({ type: 'idle' });
        },
      }),
      dropTargetForElements({
        element: root,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            {
              type: 'cell',
              itemId: item.id,
            },
            {
              input,
              element,
              allowedEdges: ['top', 'bottom'],
            },
          );
        },
        onDragEnter: ({ source, self }) => {
          if (source.data.itemId !== item.id) {
            setClosestEdge(extractClosestEdge(self.data));
          }
        },
        onDrag: ({ source, self }) => {
          if (source.data.itemId !== item.id) {
            setClosestEdge(extractClosestEdge(self.data));
          }
        },
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      }),
    );
  }, [rootRef, handleRef, item]);

  // NOTE: No gaps between cells (so that the drop indicators doesn't flicker).
  // And ensure padding doesn't change position of cursor when dragging.
  return (
    <>
      <div role='none' className='relative mli-2'>
        <GridCellPrimitive
          ref={rootRef}
          handleRef={handleRef}
          classNames={['transition opacity-100', state.type === 'dragging' && 'opacity-25', classNames]}
        >
          <Cell item={item} />
        </GridCellPrimitive>
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </div>

      {state.type === 'preview' &&
        createPortal(
          <div role='none' style={{ width: `${state.rect.width}px` } as CSSProperties}>
            <GridCellPrimitive classNames={['bg-inputSurface', classNames]}>
              <Cell item={item} dragging={true} />
            </GridCellPrimitive>
          </div>,
          state.container,
        )}
    </>
  );
});

GridCell.displayName = 'Grid.Cell';

type GridCellPrimitiveProps = ThemedClassName<
  PropsWithChildren<{
    handleRef?: Ref<HTMLDivElement>;
  }>
>;

const GridCellPrimitive = memo(
  forwardRef<HTMLDivElement, GridCellPrimitiveProps>(({ classNames, children, handleRef }, ref) => {
    const focusableRef = useRef<HTMLDivElement>(null);
    const focusableGroupAttrs = useFocusableGroup();

    return (
      <div ref={ref} role='none' className='p-1'>
        <div
          ref={focusableRef}
          role='none'
          className={mx(
            // TODO(burdon): Options for border/spacing.
            'group is-full grid grid-cols-[min-content_1fr_min-content] gap-2 p-2 overflow-hidden',
            borderClasses,
            classNames,
          )}
          tabIndex={0}
          onKeyDown={(event) => {
            switch (event.key) {
              // TODO(burdon): useFocusableGroup should do this.
              case 'Escape': {
                const element =
                  event.target === focusableRef.current
                    ? findFirstFocusableAncestor(focusableRef.current!)
                    : focusableRef.current;
                element?.focus();
                break;
              }
            }
          }}
          {...focusableGroupAttrs}
        >
          <div role='none'>
            <div ref={handleRef} role='none' className={iconClasses}>
              <Icon classNames='cursor-pointer' icon='ph--dots-six-vertical--regular' size={5} />
            </div>
          </div>
          <div role='none'>{children}</div>
          <div role='none'>
            <div role='none' className={iconClasses}>
              {/* TODO(burdon): Menu. */}
              <Icon classNames='cursor-pointer' icon='ph--list--regular' size={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }),
);

//
// Grid
//

export const Grid = {
  Root: GridRoot,
  Viewport: GridViewport,
  Column: GridColumn,
  Stack: GridStack,
  Cell: GridCell,
};

export type { GridRootProps, GridViewportProps, GridColumnProps, GridStackProps, GridCellProps };
