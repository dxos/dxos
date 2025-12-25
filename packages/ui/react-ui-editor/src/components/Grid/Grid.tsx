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

// TODO(burdon): Factor out/generalize?

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

type GridViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const GridViewport = ({ classNames, children }: GridViewportProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Handle all mutation events.
  useEffect(() => {
    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          log.info('drop', { source, location });
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
        getData: () => ({ type: 'column' }),
      }),
    );
  }, [rootRef]);

  return (
    <div role='none' className={mx('flex flex-col is-full gap-2 p-2 overflow-y-auto', classNames)} ref={rootRef}>
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
        onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
          const rect = source.element.getBoundingClientRect();
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

  return (
    <>
      <GridCellPrimitive
        classNames={[state.type === 'dragging' && 'opacity-25', classNames]}
        item={item}
        handleRef={handleRef}
        ref={rootRef}
      >
        {children}
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </GridCellPrimitive>

      {state.type === 'preview' &&
        createPortal(
          <GridCellPrimitive classNames={['bg-inputSurface', classNames]} item={item}>
            {/* TODO(burdon): Get placeholder */}
            {item.id}
          </GridCellPrimitive>,
          state.container,
        )}
    </>
  );
});

type GridCellPrimitiveProps = GridCellProps & { handleRef?: Ref<HTMLDivElement> };

const GridCellPrimitive = forwardRef<HTMLDivElement, GridCellPrimitiveProps>(
  ({ classNames, children, handleRef }, ref) => {
    return (
      <div
        role='none'
        className={mx('relative flex is-full p-2 gap-2 border border-subduedSeparator rounded-sm', classNames)}
        ref={ref}
      >
        <div>
          <div ref={handleRef} className='pbs-0.5 hover:bg-inputSurface rounded-sm'>
            <Icon classNames='cursor-pointer' icon='ph--dots-six-vertical--regular' size={5} />
          </div>
        </div>
        {children}
      </div>
    );
  },
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
