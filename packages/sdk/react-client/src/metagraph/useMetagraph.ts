//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { Metagraph } from '@dxos/metagraph';
import { Module } from '@dxos/protocols/proto/dxos/config';

import { useConfig } from '../client';

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

/**
 * Query modules.
 */
export const useModules = (tags: string[], pollingMs = -1): Module[] => {
  const metagraph = useMetagraph();
  const [modules, setModules] = useState<Module[]>([]);
  useEffect(() => {
    if (!metagraph) {
      return;
    }

    let interval: NodeJS.Timeout;
    let unsubscribe: () => void | undefined;
    setTimeout(async () => {
      const observable = await metagraph.modules.query({ tags });
      unsubscribe = observable.subscribe({
        onUpdate: (modules) => {
          log('modules query', { modules });
          setModules(modules);
        }
      });

      observable.fetch();
      if (pollingMs > 1_000) {
        interval = setInterval(() => observable.fetch());
      }
    });

    return () => {
      interval && clearInterval(interval);
      unsubscribe?.();
    };
  }, [metagraph]);

  return modules;
};
