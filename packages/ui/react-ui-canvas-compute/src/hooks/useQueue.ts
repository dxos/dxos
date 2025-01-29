//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { type EdgeHttpClient } from '@dxos/edge-client';
import { type DXN } from '@dxos/keys';

import { useDynamicCallback } from './useDynamicCallback';

// TODO(burdon): Move to edge SDK?

export type UseQueueOptions = {
  pollInterval?: number;
};

// TODO(burdon): Convert to object.
export const useQueue = <T>(edgeHttpClient: EdgeHttpClient, queueDxn?: DXN, options: UseQueueOptions = {}) => {
  const [objects, setObjects] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Only for initial load.
  const [error, setError] = useState<Error | null>(null);
  const refreshId = useRef<number>(0);

  const { subspaceTag, spaceId, queueId } = queueDxn?.asQueueDXN() ?? {};

  const append = useDynamicCallback(async (items: T[]) => {
    if (!subspaceTag || !spaceId || !queueId) {
      return;
    }

    try {
      setObjects((prevItems) => [...prevItems, ...items]);
      void edgeHttpClient.insertIntoQueue(subspaceTag, spaceId, queueId, items);
    } catch (err) {
      setError(err as Error);
    }
  });

  const refresh = useDynamicCallback(async () => {
    if (!subspaceTag || !spaceId || !queueId) {
      return;
    }

    const thisRefreshId = ++refreshId.current;
    try {
      const { objects } = await edgeHttpClient.queryQueue(subspaceTag, spaceId, { queueId });
      if (thisRefreshId !== refreshId.current) {
        return;
      }

      setObjects(objects as T[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (options.pollInterval) {
      const poll = () => {
        void refresh().finally(() => {
          interval = setTimeout(poll, options.pollInterval);
        });
      };
      poll();
    }

    return () => clearInterval(interval);
  }, [options.pollInterval]);

  useEffect(() => {
    void refresh();
  }, [queueDxn?.toString()]);

  return {
    objects,
    append,
    isLoading,
    error,
  };
};
