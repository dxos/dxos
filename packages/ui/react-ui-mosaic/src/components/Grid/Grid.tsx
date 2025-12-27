//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import {
  useArrowNavigationGroup,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
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
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type ComponentData, type ContainerData } from '../../hooks';

//
// Styles
//

const classes: Record<string, string> = {
  icon: 'bs-6 is-6 grid place-items-center hover:bg-inputSurface rounded-sm transition opacity-10 group-hover:opacity-100',

  borderFocus: [
    'outline-none border rounded-sm transition border-subduedSeparator',
    // Tabster nav/focus.
    'focus:border-accentSurface',
    // Child has focus.
    'focus-within:border-neutralFocusIndicator',
    // Active drop target.
    'has-[[data-active=true]]:border-neutralFocusIndicator',
  ].join(' '),
};

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

type GridViewportProps = ThemedClassName<PropsWithChildren>;

const GridViewport = ({ classNames, children }: GridViewportProps) => {
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'horizontal', memorizeCurrent: true, tabbable: true });
  const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

  return (
    <div role='none' className={mx('flex bs-full is-full overflow-x-auto p-2 gap-4', classNames)} {...tabsterAttrs}>
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
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
  const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

  return (
    <div
      role='none'
      tabIndex={0}
      {...tabsterAttrs}
      className={mx('relative flex flex-col is-full overflow-hidden', classes.borderFocus, classNames)}
    >
      {children}
    </div>
  );
});

GridColumn.displayName = 'Grid.Column';

//
// Stack
// Ref: https://codesandbox.io/p/sandbox/vc6s5t?file=%2Fpragmatic-drag-and-drop%2Fdocumentation%2Fexamples%2Fpieces%2Fboard%2Fcolumn.tsx
//

type ContainerState = { type: 'idle' } | { type: 'active' };

type GridStackProps = ThemedClassName<
  {
    id: string;
    objects: Obj.Any[];
  } & Pick<GridCellProps, 'Cell' | 'canDrag' | 'canDrop'>
>;

const GridStack = memo(({ classNames, id, objects, Cell, canDrag = false, canDrop = false }: GridStackProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ContainerState>({ type: 'idle' });

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    return combine(
      dropTargetForElements({
        element: rootRef.current,
        getData: () => ({ type: 'container', id }) satisfies ContainerData,
        canDrop: () => canDrop,
        onDragEnter: () => setState({ type: 'active' }),
        onDragLeave: () => setState({ type: 'idle' }),
      }),
      autoScrollForElements({
        element: rootRef.current,
      }),
    );
  }, [rootRef, canDrop]);

  return (
    <div
      ref={rootRef}
      role='none'
      className={mx('relative flex flex-col is-full plb-2 overflow-y-auto', classNames)}
      {...{ 'data-active': state.type === 'active' }}
    >
      {objects.map((object) => (
        <Grid.Cell key={object.id} containerId={id} object={object} Cell={Cell} canDrag={canDrag} canDrop={canDrop} />
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
  containerId: string;
  object: Obj.Any;
  Cell: FC<{ object: Obj.Any; dragging?: boolean }>;

  // TODO(burdon): Make dynamic.
  canDrag?: boolean;
  canDrop?: boolean;
}>;

const GridCell = memo(({ classNames, containerId, object, Cell, canDrag = false, canDrop = false }: GridCellProps) => {
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
        getInitialData: () => ({ type: 'cell', id: object.id, containerId }) satisfies ComponentData,
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
              id: object.id,
              containerId,
            } satisfies ComponentData,
            {
              input,
              element,
              allowedEdges: ['top', 'bottom'],
            },
          );
        },

        canDrop: () => canDrop,
        onDragEnter: ({ source, self }) => {
          if (source.data.id !== object.id) {
            setClosestEdge(extractClosestEdge(self.data));
          }
        },
        onDrag: ({ source, self }) => {
          if (source.data.id !== object.id) {
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
  }, [rootRef, handleRef, object]);

  // NOTE: No gaps between cells (so that the drop indicators doesn't flicker).
  // And ensure padding doesn't change position of cursor when dragging.
  return (
    <>
      <div role='none' className='relative mli-2'>
        <GridCellPrimitive
          ref={rootRef}
          handleRef={canDrag ? handleRef : undefined}
          classNames={['transition opacity-100', state.type === 'dragging' && 'opacity-25', classNames]}
        >
          <Cell object={object} />
        </GridCellPrimitive>
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </div>

      {state.type === 'preview' &&
        createPortal(
          <div role='none' style={{ width: `${state.rect.width}px` } as CSSProperties}>
            <GridCellPrimitive classNames={['bg-inputSurface', classNames]}>
              <Cell object={object} dragging={true} />
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
            classes.borderFocus,
            classNames,
          )}
          tabIndex={0}
          {...focusableGroupAttrs}
        >
          <div role='none'>
            {handleRef && (
              <div ref={handleRef} role='none' className={classes.icon}>
                <Icon classNames='cursor-pointer' icon='ph--dots-six-vertical--regular' size={5} />
              </div>
            )}
          </div>
          <div role='none'>{children}</div>
          <div role='none'>
            <div role='none' className={classes.icon}>
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
