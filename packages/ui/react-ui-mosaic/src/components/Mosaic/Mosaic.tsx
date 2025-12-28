//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { type ContainerData, type DropEventHandler, type ItemData } from '../../hooks';

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

        const sourceData = source.data as ItemData;
        const sourceContainer = containers[sourceData.containerId];
        if (!sourceContainer) {
          log.warn('invalid source', { source: sourceData });
          return;
        }

        // TODO(burdon): Target could be a placeholder -- use it to get the location.
        // const target = location.current.dropTargets.find((target) => target.data.type === 'item');
        // const targetData = target?.data as ItemData;

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

        if (sourceContainer === targetContainer) {
          targetContainer.onUpdate?.({ insert: sourceData });
        } else {
          targetContainer.onUpdate?.({ insert: sourceData });
          sourceContainer.onUpdate?.({ remove: sourceData });
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

type ContainerProps = PropsWithChildren<{ handler: DropEventHandler }>;

const Container = ({ children, handler }: ContainerProps) => {
  const { addContainer, removeContainer } = useMosaicContext(handler.id);
  useEffect(() => {
    addContainer(handler);
    return () => removeContainer(handler.id);
  }, [handler]);

  return <>{children}</>;
};

//
// Mosaic
//

export const Mosaic = { Root, Container };

export type { RootProps as MosaicRootProps, ContainerProps as MosaicContainerProps };
