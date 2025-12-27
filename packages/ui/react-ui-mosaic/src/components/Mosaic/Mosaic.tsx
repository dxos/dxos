//
// Copyright 2025 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { type ComponentData, type ContainerData, type DropEventHandler } from '../../hooks';

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

        // TODO(burdon): Also get target cell (to compute position).
        const target = location.current.dropTargets.find((t) => t.data.type === 'container');
        if (!target) {
          log.warn('invalid drop', { source, location });
          return;
        }

        const sourceData = source.data as ComponentData;
        const targetData = target.data as ContainerData;
        const container = containers[targetData.id];
        if (!container) {
          log.warn('invalid container', { id: targetData.id });
          return;
        }

        container.onDrop({ source: sourceData, target: targetData });
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

type ContainerProps = PropsWithChildren<{ id: string } & DropEventHandler>;

const Container = ({ children, id, canDrop, onDrop }: ContainerProps) => {
  const { addContainer, removeContainer } = useMosaicContext(id);
  useEffect(() => {
    addContainer({ id, canDrop, onDrop });
    return () => removeContainer(id);
  }, [id, canDrop, onDrop]);

  return <>{children}</>;
};

//
// Mosaic
//

export const Mosaic = { Root, Container };

export type { RootProps as MosaicRootProps, ContainerProps as MosaicContainerProps };
