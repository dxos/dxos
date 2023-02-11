//
// Copyright 2020 DXOS.org
//

import { Context, createContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { Metagraph } from '@dxos/metagraph';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useConfig } from '@dxos/react-client';

export type MetagraphContextType = {
  frames?: Module[];
  bots?: Module[];
};

export const MetagraphContext: Context<MetagraphContextType> = createContext<MetagraphContextType>({});

/**
 * Retrieve a configured metagraph object.
 */
export const useMetagraph = () => {
  const config = useConfig();
  const [metagraph, setMetagraph] = useState<Metagraph>();
  useEffect(() => {
    const metagraph = new Metagraph(config);
    setMetagraph(metagraph);
  }, [config]);

  return metagraph;
};

export type ModulesResult = {
  modules: Module[];
  isLoading: boolean;
};

/**
 * Query modules.
 */
export const useModules = (type: string, tags?: string[], pollingMs = -1): ModulesResult => {
  const metagraph = useMetagraph();
  const [isLoading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (!metagraph) {
      return;
    }

    let interval: NodeJS.Timeout;
    let unsubscribe: () => void | undefined;
    setTimeout(async () => {
      const observable = await metagraph.modules.query({ tags });
      setModules(observable.results);
      setLoading(false);
      unsubscribe = observable.subscribe({
        onUpdate: (modules) => {
          // TODO(burdon): Check still mounted.
          log('modules query', { modules });
          setModules(modules);
        }
      });

      const minPollingInterval = 1_000;
      if (pollingMs > minPollingInterval) {
        // TODO(wittjosiah): More detailed status which takes into account subsequent loading states.
        interval = setInterval(() => observable.fetch());
      }
    });

    return () => {
      interval && clearInterval(interval);
      unsubscribe?.();
    };
  }, [metagraph]);

  return { modules, isLoading };
};
