//
// Copyright 2020 DXOS.org
//

import React, { Context, createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Metagraph, MetagraphClient, Query } from '@dxos/metagraph';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useConfig } from '@dxos/react-client';

export type MetagraphContextType = {
  client: Metagraph;
};

export const MetagraphContext: Context<MetagraphContextType | undefined> = createContext<
  MetagraphContextType | undefined
>(undefined);

export const MetagraphProvider: FC<{ children?: ReactNode; value?: MetagraphContextType }> = ({ children, value }) => {
  const config = useConfig();

  return (
    <MetagraphContext.Provider value={value ?? { client: new MetagraphClient(config) }}>
      {children}
    </MetagraphContext.Provider>
  );
};

/**
 * Retrieve a configured metagraph object.
 */
export const useMetagraph = (): Metagraph => {
  const { client } = useContext(MetagraphContext) ?? raise(new Error('Missing MetagraphContext.'));
  return client;
};

export type ModulesResult = {
  modules: Module[];
  isLoading: boolean;
};

export type UseModulesOptions = {
  polling?: number;
};

const MAX_POLLING_INTERVAL = 3_000;

/**
 * Query modules.
 */
export const useModules = (query: Query, { polling }: UseModulesOptions = {}): ModulesResult => {
  const metagraph = useMetagraph();
  const [isLoading, setLoading] = useState(true);

  // TODO(burdon): Better cache.
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (!metagraph) {
      return;
    }

    let interval: NodeJS.Timeout;
    let unsubscribe: () => void | undefined;
    setTimeout(async () => {
      const observable = await metagraph.modules.query(query);
      setModules(observable.results);
      setLoading(false);
      unsubscribe = observable.subscribe({
        onUpdate: (modules) => {
          // TODO(burdon): Check still mounted.
          log('modules query', { modules });
          setModules(modules);
        }
      });

      if (polling) {
        // TODO(wittjosiah): More detailed status which takes into account subsequent loading states.
        interval = setInterval(() => observable.fetch(), Math.max(polling, MAX_POLLING_INTERVAL));
      }
    });

    return () => {
      interval && clearInterval(interval);
      unsubscribe?.();
    };
  }, [metagraph]);

  return { modules, isLoading };
};
