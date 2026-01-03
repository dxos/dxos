//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDragPayload,
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { composeRefs, useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import {
  type MosaicCellData,
  type MosaicContainerData,
  type MosaicDropTargetData,
  type MosaicEventHandler,
} from './types';

//
// Context
//

type MosaicContextValue = {
  containers: Record<string, MosaicEventHandler>;
  addContainer: (container: MosaicEventHandler) => void;
  removeContainer: (id: string) => void;
};

const [MosaicContextProvider, useMosaicContext] = createContext<MosaicContextValue>('Mosaic');

//
// Root
//

type RootProps = PropsWithChildren;

const Root = ({ children }: RootProps) => {
  const [handlers, setHandlers] = useState<Record<string, MosaicEventHandler>>({});
  const currentHandler = useRef<MosaicEventHandler>(undefined);

  const getSourceHandler = (source: ElementDragPayload): { data: MosaicCellData; handler?: MosaicEventHandler } => {
    const data = source.data as MosaicCellData;
    return { data, handler: handlers[data.containerId] };
  };

  const getTargetHandler = (
    location: DragLocationHistory,
  ): { data?: MosaicDropTargetData; handler?: MosaicEventHandler } => {
    for (const target of location.current.dropTargets) {
      const data = target.data as MosaicDropTargetData;
      let containerId: string;
      switch (data.type) {
        case 'cell':
        case 'placeholder':
          containerId = data.containerId;
          break;
        case 'container':
          containerId = data.id;
          break;
      }

      const handler = handlers[containerId];
      if (handler) {
        return { data, handler };
      }
    }

    return {};
  };

  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const { data } = getSourceHandler(source);
        const { handler } = getTargetHandler(location);
        if (handler) {
          const { clientX: x, clientY: y } = location.current.input;
          handler.onDrag?.({ source: data, position: { x, y } });
        }
      },
      onDropTargetChange: ({ location }) => {
        const { handler } = getTargetHandler(location);
        currentHandler.current?.onCancel?.();
        currentHandler.current = handler;
      },
      onDrop: ({ source, location }) => {
        log('onDrop', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });

        try {
          // Get the source container.
          const { data: sourceData, handler: sourceHandler } = getSourceHandler(source);
          if (!sourceHandler) {
            log.warn('invalid source', { source: sourceData, handlers: Object.keys(handlers) });
            return;
          }

          // Get the target container.
          const { data: targetData, handler: targetHandler } = getTargetHandler(location);
          if (!targetHandler) {
            log.warn('invalid target', { source: sourceData, location, handlers: Object.keys(handlers) });
            return;
          }

          // TODO(burdon): Check doesn't already exist in collection.
          if (sourceHandler === targetHandler) {
            targetHandler.onDrop?.({ source: sourceData, target: targetData });
          } else {
            if (!sourceHandler.onTake) {
              log.warn('invalid source', { source: sourceData });
              return;
            }

            sourceHandler.onTake?.({ source: sourceData }, async (object) => {
              targetHandler.onDrop?.({ source: { ...sourceData, object }, target: targetData });
              return true;
            });
          }
        } finally {
          currentHandler.current?.onCancel?.();
          currentHandler.current = undefined;
        }
      },
    });
  }, [handlers]);

  return (
    <MosaicContextProvider
      containers={handlers}
      addContainer={(container) => setHandlers((containers) => ({ ...containers, [container.id]: container }))}
      removeContainer={(id) =>
        setHandlers((containers) => {
          delete containers[id];
          return { ...containers };
        })
      }
    >
      {children}
    </MosaicContextProvider>
  );
};

//
// Container
//

type MosaicContainerContextValue = {
  id: string;
};

const [MosaicContainerContextProvider, useMosaicContainerContext] =
  createContext<MosaicContainerContextValue>('MosaicContainer');

/**
 * Target: [&:has(>_[data-mosaic-container-state=active])]
 */
const MOSAIC_DATA_CONTAINER_STATE = 'data-mosaic-container-state';

type ContainerState = { type: 'idle' } | { type: 'active' };

type ContainerProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    autoscroll?: boolean;
    handler: MosaicEventHandler;
  }>
>;

/**
 * Ref https://www.radix-ui.com/primitives/docs/guides/composition
 * NOTE: Children must forwardRef and spread props to root element.
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ classNames, children, asChild, autoscroll, handler }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    const { addContainer, removeContainer } = useMosaicContext(handler.id);
    useEffect(() => {
      addContainer(handler);
      return () => removeContainer(handler.id);
    }, [handler]);

    const [state, setState] = useState<ContainerState>({ type: 'idle' });
    useEffect(() => {
      if (!rootRef.current) {
        return;
      }

      return combine(
        ...[
          dropTargetForElements({
            element: rootRef.current,
            getData: () => {
              return {
                type: 'container',
                id: handler.id,
              } satisfies MosaicContainerData;
            },
            canDrop: ({ source }) => {
              return (
                (source.data.type === 'cell' && handler.canDrop?.({ source: source.data as MosaicCellData })) || false
              );
            },
            onDragStart: () => {
              setState({ type: 'active' });
            },
            onDragEnter: () => {
              setState({ type: 'active' });
            },
            onDragLeave: () => {
              setState({ type: 'idle' });
            },
            onDrop: () => {
              setState({ type: 'idle' });
            },
          }),
          autoscroll &&
            autoScrollForElements({
              element: rootRef.current,
            }),
        ].filter(isTruthy),
      );
    }, [rootRef, handler]);

    return (
      <MosaicContainerContextProvider id={handler.id}>
        <Root
          {...{ [MOSAIC_DATA_CONTAINER_STATE]: state.type }}
          role='none'
          className={mx(classNames)}
          ref={composedRef}
        >
          {children}
        </Root>
      </MosaicContainerContextProvider>
    );
  },
);

Container.displayName = 'MosaicContainer';

//
// Cell
//

/**
 * Target: data-[mosaic-cell-state=dragging]
 */
const MOSAIC_DATA_CELL_STATE = 'data-mosaic-cell-state';

type CellState = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect: DOMRect } | { type: 'dragging' };

type CellProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    dragHandle?: HTMLDivElement | null;
    object: Obj.Any;
  }>
>;

const Cell = forwardRef<HTMLDivElement, CellProps>(
  ({ classNames, children, asChild, dragHandle, object }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;
    const { id: containerId } = useMosaicContainerContext(Cell.displayName!);
    const [state, setState] = useState<CellState>({ type: 'idle' });

    useLayoutEffect(() => {
      if (!rootRef.current || !containerId) {
        return;
      }

      const data = {
        type: 'cell',
        id: object.id,
        containerId,
        object,
      } satisfies MosaicCellData;

      // TODO(burdon): Preview.
      return combine(
        draggable({
          element: rootRef.current,
          dragHandle: dragHandle || undefined,
          getInitialData: () => data,
          onDragStart: () => {
            setState({ type: 'dragging' });
          },
          onDrop: () => {
            setState({ type: 'idle' });
          },
        }),
        dropTargetForElements({
          element: rootRef.current,
          getData: ({ input, element }) => {
            return attachClosestEdge(data, { input, element, allowedEdges: [] });
          },
        }),
      );
    }, [rootRef, dragHandle, containerId]);

    return (
      <Root
        {...{ [MOSAIC_DATA_CELL_STATE]: state.type }}
        role='none'
        className={mx('transition-opacity', classNames)}
        ref={composedRef}
      >
        {children}
      </Root>
    );
  },
);

Cell.displayName = 'MosaicCell';

//
// Mosaic
//

export const Mosaic = { Root, Container, Cell };

export type { RootProps as MosaicRootProps, ContainerProps as MosaicContainerProps, CellProps as MosaicCellProps };

export { MOSAIC_DATA_CONTAINER_STATE, MOSAIC_DATA_CELL_STATE };
