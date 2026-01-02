//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
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
import { CONTAINER_DATA_ACTIVE_ATTR, type MosaicCellData, type PlaceholderData } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

//
// Styles
//

const classes: Record<string, string> = {
  icon: 'bs-6 is-6 grid place-items-center hover:bg-inputSurface rounded-sm transition opacity-10 group-hover/cell:opacity-100',

  borderFocus: [
    'outline-none border rounded-sm transition border-subduedSeparator',
    // Tabster nav/focus.
    'focus:border-accentSurface',
    // Child has focus.
    'focus-within:border-neutralFocusIndicator',
    // Active drop target.
    `has-[[${CONTAINER_DATA_ACTIVE_ATTR}=true]]:border-neutralFocusIndicator`,
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

type GridColumnProps = ThemedClassName<PropsWithChildren>;

const GridColumn = forwardRef<HTMLDivElement, GridColumnProps>(
  ({ classNames, children }: GridColumnProps, forwardedRef) => {
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

    return (
      <div
        ref={forwardedRef}
        role='none'
        tabIndex={0}
        {...tabsterAttrs}
        className={mx('flex flex-col is-full overflow-hidden', classes.borderFocus, classNames)}
      >
        {children}
      </div>
    );
  },
);

GridColumn.displayName = 'Grid.Column';

//
// Stack
//

type GridStackProps = ThemedClassName<
  {
    id: string;
    objects?: Obj.Any[];
  } & Pick<GridCellProps, 'Cell' | 'canDrag' | 'canDrop'>
>;

const GridStack = forwardRef<HTMLDivElement, GridStackProps>(
  ({ classNames, id, objects, Cell, canDrag, canDrop, ...props }, forwardedRef) => {
    const placeholderRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!placeholderRef.current) {
        return;
      }

      return dropTargetForElements({
        element: placeholderRef.current,
        getData: () =>
          ({
            type: 'placeholder',
            location: 'bottom',
            containerId: id,
          }) satisfies PlaceholderData,
      });
    }, [placeholderRef, id]);

    return (
      <div
        ref={forwardedRef}
        role='none'
        className={mx('flex flex-col is-full plb-2 overflow-y-auto', classNames)}
        {...props}
      >
        {objects?.map((object) => (
          <div key={object.id} role='none' className='p-1'>
            <GridCell containerId={id} object={object} Cell={Cell} canDrag={canDrag} canDrop={canDrop} />
          </div>
        ))}
        <div role='none' className='p-3' ref={placeholderRef}>
          <div
            // TODO(burdon): Display while dragging.
            className={mx('bs-[8rem]', 'outline-none border rounded-sm transition border-transparent border-dashed')}
          />
        </div>
      </div>
    );
  },
);

GridStack.displayName = 'Grid.Stack';

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

// TODO(burdon): Memo?
// TODO(burdon): Move into card.
const GridCell = memo(({ classNames, containerId, object, Cell, canDrag = false, canDrop = false }: GridCellProps) => {
  const rootRef = useRef<HTMLDivElement>(null); // TODO(burdon): forwardedRef.
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
        getInitialData: () =>
          ({
            type: 'item',
            id: object.id,
            object,
            containerId,
          }) satisfies MosaicCellData,
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
              type: 'item',
              id: object.id,
              object,
              containerId,
            } satisfies MosaicCellData,
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
          <div
            role='none'
            style={
              {
                width: `${state.rect.width}px`,
                height: `${state.rect.height}px`,
              } as CSSProperties
            }
          >
            <GridCellPrimitive classNames={['bg-inputSurface', classNames]}>
              <Cell object={object} dragging />
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

const GridCellPrimitive = forwardRef<HTMLDivElement, GridCellPrimitiveProps>(
  ({ classNames, children, handleRef }, forwardedRef) => {
    const focusableGroupAttrs = useFocusableGroup();

    return (
      <div
        ref={forwardedRef}
        role='none'
        className={mx(
          'group/cell is-full grid grid-cols-[min-content_1fr_min-content] overflow-hidden',
          classes.borderFocus,
          classNames,
        )}
        tabIndex={0}
        {...focusableGroupAttrs}
      >
        <div role='none' className='shrink-0 p-2'>
          <div ref={handleRef} role='none' className={classes.icon}>
            <Icon classNames='cursor-pointer' icon='ph--dots-six-vertical--regular' size={5} />
          </div>
        </div>
        <div role='none' className='grow overflow-hidden'>
          {children}
        </div>
        <div role='none' className='shrink-0 p-2'>
          <div role='none' className={classes.icon}>
            <Icon classNames='cursor-pointer' icon='ph--list--regular' size={5} />
          </div>
        </div>
      </div>
    );
  },
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

export { classes };
