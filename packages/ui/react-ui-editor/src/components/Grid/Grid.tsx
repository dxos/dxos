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
import { createContext } from '@radix-ui/react-context';
import React, {
  type CSSProperties,
  type ComponentType,
  type PropsWithChildren,
  type Ref,
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

// TODO(burdon): Factor out/generalize? (remove deps)

//
// Context
//

type GridContextValue = {};

const [GridContextProvider] = createContext<GridContextValue>('Grid');

//
// Root
//

type GridRootProps = PropsWithChildren<{}>;

const GridRoot = ({ children }: GridRootProps) => {
  return <GridContextProvider>{children}</GridContextProvider>;
};

GridRoot.displayName = 'Grid.Root';

//
// Viewport
//

interface GridEventHandler {
  onCellMove?: (from: number, to: number) => void;
}

type GridViewportProps = ThemedClassName<PropsWithChildren<{}>> & GridEventHandler;

const GridViewport = ({ classNames, children, onCellMove }: GridViewportProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Handle all mutation events.
  useEffect(() => {
    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          const cell = location.current.dropTargets.find((t) => t.data.type === 'cell');
          const column = location.current.dropTargets.find((t) => t.data.type === 'column');
          if (!column) {
            return;
          }

          const items = column?.data.items as Obj.Any[];
          const from = items.findIndex((item) => item.id === source.data.itemId);
          const to = items.findIndex((item) => item.id === cell?.data.itemId);
          log.info('cellMove', { from, to });
          onCellMove?.(from, to);
        },
      }),
    );
  }, [rootRef]);

  return (
    <div role='none' className={mx('flex bs-full is-full overflow-hidden', classNames)} ref={rootRef}>
      {children}
    </div>
  );
};

GridViewport.displayName = 'Grid.Viewport';

//
// Column
// Ref: https://codesandbox.io/p/sandbox/vc6s5t?file=%2Fpragmatic-drag-and-drop%2Fdocumentation%2Fexamples%2Fpieces%2Fboard%2Fcolumn.tsx
//

type GridColumnProps = ThemedClassName<{
  items: Obj.Any[];
  Component: ComponentType<{ item: Obj.Any }>;
}>;

const GridColumn = memo(({ classNames, items, Component }: GridColumnProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    return combine(
      autoScrollForElements({
        element: rootRef.current,
      }),
      dropTargetForElements({
        element: rootRef.current,
        getData: () => ({ type: 'column', items }),
      }),
    );
  }, [rootRef]);

  return (
    <div role='none' className={mx('relative flex flex-col is-full plb-2 overflow-y-auto', classNames)} ref={rootRef}>
      {items.map((item) => (
        <Grid.Cell key={item.id} item={item}>
          <Component item={item} />
        </Grid.Cell>
      ))}
    </div>
  );
});

GridColumn.displayName = 'Grid.Column';

//
// Cell
//

type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect: DOMRect } | { type: 'dragging' };

type GridCellProps = ThemedClassName<PropsWithChildren<{ item: Obj.Any }>>;

const GridCell = memo(({ classNames, children, item }: GridCellProps) => {
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
  return (
    <>
      <div className='relative mli-1'>
        <GridCellPrimitive
          classNames={[state.type === 'dragging' && 'opacity-25', classNames]}
          item={item}
          handleRef={handleRef}
          ref={rootRef}
        >
          {children}
        </GridCellPrimitive>
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </div>

      {state.type === 'preview' &&
        createPortal(
          <div style={{ width: `${state.rect.width}px` } as CSSProperties}>
            <GridCellPrimitive classNames={['bg-inputSurface', classNames]} item={item}>
              {/* TODO(burdon): Get placeholder */}
              {item.id}
            </GridCellPrimitive>
          </div>,
          state.container,
        )}
    </>
  );
});

const iconClasses = 'pbs-0.5 hover:bg-inputSurface rounded-sm transition opacity-10 group-hover:opacity-100';

type GridCellPrimitiveProps = GridCellProps & { handleRef?: Ref<HTMLDivElement> };

const GridCellPrimitive = memo(
  forwardRef<HTMLDivElement, GridCellPrimitiveProps>(({ classNames, children, handleRef }, ref) => {
    return (
      <div role='none' className='p-1' ref={ref}>
        <div
          role='none'
          className={mx(
            // TODO(burdon): Options for border/spacing.
            'group is-full grid grid-cols-[min-content_1fr_min-content] gap-2 p-2 border border-subduedSeparator rounded-sm',
            classNames,
          )}
        >
          <div>
            <div className={iconClasses} ref={handleRef}>
              <Icon classNames='cursor-pointer' icon='ph--dots-six-vertical--regular' size={5} />
            </div>
          </div>
          {children}
          <div>
            <div className={iconClasses}>
              {/* TODO(burdon): Menu. */}
              <Icon classNames='cursor-pointer' icon='ph--list--regular' size={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }),
);

GridCell.displayName = 'Grid.Cell';

//
// Grid
//

export const Grid = {
  Root: GridRoot,
  Viewport: GridViewport,
  Column: GridColumn,
  Cell: GridCell,
};

export type { GridRootProps, GridViewportProps, GridColumnProps, GridCellProps };
