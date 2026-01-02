//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types';
import {
  type ElementDragPayload,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, forwardRef, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
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

  const getSourceHandler = (
    source: ElementDragPayload,
  ): { data: MosaicCellData; handler: MosaicEventHandler | undefined } => {
    const data = source.data as MosaicCellData;
    return { data, handler: handlers[data.containerId] };
  };

  const getTargetHandler = (
    location: DragLocationHistory,
  ): { data: MosaicContainerData; handler: MosaicEventHandler | undefined } => {
    const targetData = location.current.dropTargets.find((target) => target.data.type === 'container')
      ?.data as MosaicContainerData;
    return { data: targetData, handler: targetData?.id ? handlers[targetData.id] : undefined };
  };

  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const { data } = getSourceHandler(source);
        const { handler } = getTargetHandler(location);
        if (handler) {
          const { clientX: x, clientY: y } = location.current.input;
          handler.onDrag?.({ item: data, position: { x, y } });
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
            log.warn('invalid source', { source: sourceData });
            return;
          }

          // Get the target container.
          const { handler: targetHandler } = getTargetHandler(location);
          if (!targetHandler) {
            log.warn('invalid target', { source: sourceData });
            return;
          }

          // Get the target location.
          const target = location.current.dropTargets.find(
            (target) => target.data.type === 'item' || target.data.type === 'placeholder',
          );

          // TODO(burdon): Check doesn't already exist in collection.
          if (sourceHandler === targetHandler) {
            targetHandler.onDrop?.({ object: sourceData.object, at: target?.data as MosaicDropTargetData });
          } else {
            if (!sourceHandler.onTake) {
              log.warn('invalid source', { source: sourceData });
              return;
            }
            sourceHandler.onTake?.(sourceData, (object) => {
              targetHandler.onDrop?.({ object, at: target?.data as MosaicDropTargetData });
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

export const CONTAINER_DATA_ACTIVE_ATTR = 'data-active';

type ContainerState = { type: 'idle' } | { type: 'active' };

type ContainerProps = PropsWithChildren<{ asChild?: boolean; autoscroll?: boolean; handler: MosaicEventHandler }>;

/**
 * Ref https://www.radix-ui.com/primitives/docs/guides/composition
 * NOTE: Children must forwardRef and spread props to root element.
 */
const Container = ({ children, asChild, autoscroll, handler }: ContainerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
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
          getData: () =>
            ({
              type: 'container',
              id: handler.id,
            }) satisfies MosaicContainerData,
          canDrop: ({ source }) => source.data.type === 'item' && handler.canDrop(source.data as MosaicCellData),
          onDragEnter: () => {
            setState({ type: 'active' });
          },
          onDragLeave: () => {
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
    <Root {...{ [CONTAINER_DATA_ACTIVE_ATTR]: state.type === 'active' }} ref={rootRef}>
      {children}
    </Root>
  );
};

//
// Cell
// TODO(burdon): Replace Grid.
// TODO(burdon): Common core for StackItem.
//

type CellProps = PropsWithChildren;

const Cell = forwardRef<HTMLDivElement, CellProps>((props, forwardedRef) => {
  return <div ref={forwardedRef}>{props.children}</div>;
});

//
// Mosaic
//

export const Mosaic = { Root, Container, Cell };

export type { RootProps as MosaicRootProps, ContainerProps as MosaicContainerProps, CellProps as MosaicCellProps };
