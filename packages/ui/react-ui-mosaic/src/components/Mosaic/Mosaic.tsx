//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { type ContainerData, type DropEventHandler, type DropTargetData, type ItemData } from '../../hooks';

// TODO(burdon): DragContext.
// TODO(burdon): Register containers and drop handlers.
// TODO(burdon): Demo different "zones".
// TODO(burdon): Morph preview when over different zones?
// TODO(burdon): Drop into document.

//
// Context
//

type MosaicContextValue = {
  containers: Record<string, DropEventHandler>;
  addContainer: (container: DropEventHandler) => void;
  removeContainer: (id: string) => void;
};

const [MosaicContextProvider, useMosaicContext] = createContext<MosaicContextValue>('Mosaic');

//
// Root
//

type RootProps = PropsWithChildren;

const Root = ({ children }: RootProps) => {
  const [containers, setContainers] = useState<Record<string, DropEventHandler>>({});

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        log.info('onDrop', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });

        // Get the source container.
        const sourceData = source.data as ItemData;
        const sourceContainer = containers[sourceData.containerId];
        if (!sourceContainer) {
          log.warn('invalid source', { source: sourceData });
          return;
        }

        // Get the target container.
        const container = location.current.dropTargets.find((target) => target.data.type === 'container');
        if (!container) {
          log.warn('invalid target');
          return;
        }

        const containerData = container.data as ContainerData;
        const targetContainer = containers[containerData.id];
        if (!targetContainer) {
          log.warn('invalid container', { id: containerData.id });
          return;
        }

        // Get the target location.
        const target = location.current.dropTargets.find(
          (target) => target.data.type === 'item' || target.data.type === 'placeholder',
        );

        // TODO(burdon): Check doesn't already exist in collection.
        if (sourceContainer === targetContainer) {
          targetContainer.onDrop?.({ item: sourceData, at: target?.data as DropTargetData });
        } else {
          sourceContainer.onTake?.(sourceData, (sourceData) => {
            targetContainer.onDrop?.({ item: sourceData, at: target?.data as DropTargetData });
            return true;
          });
        }
      },
    });
  }, [containers]);

  return (
    <MosaicContextProvider
      containers={containers}
      addContainer={(container) => setContainers((containers) => ({ ...containers, [container.id]: container }))}
      removeContainer={(id) =>
        setContainers((containers) => {
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

type ContainerProps = PropsWithChildren<{ asChild?: boolean; handler: DropEventHandler }>;

// TODO(burdon): Create context?
// TODO(burdon): forwardRef.
const Container = ({ children, asChild, handler }: ContainerProps) => {
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
      dropTargetForElements({
        element: rootRef.current,
        getData: () =>
          ({
            type: 'container',
            id: handler.id,
          }) satisfies ContainerData,
        canDrop: ({ source }) => source.data.type === 'item' && handler.canDrop(source.data as ItemData),
        onDragEnter: () => setState({ type: 'active' }),
        onDragLeave: () => setState({ type: 'idle' }),
      }),
      autoScrollForElements({
        element: rootRef.current,
      }),
    );
  }, [rootRef, handler]);

  // TOOD(burdon): Doesn't pass props to Slot?
  return (
    <Root {...{ [CONTAINER_DATA_ACTIVE_ATTR]: state.type === 'active' }} ref={rootRef} tabIndex={7}>
      {children}
    </Root>
  );
};

//
// Mosaic
//

export const Mosaic = { Root, Container };

export type { RootProps as MosaicRootProps, ContainerProps as MosaicContainerProps };
