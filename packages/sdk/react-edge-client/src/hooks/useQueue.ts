//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { type EdgeHttpClient } from '@dxos/edge-client';
import { type DXN } from '@dxos/keys';

export type UseQueueOptions = {
  pollInterval?: number;
};

// TODO(burdon): Convert to class.
export type Queue<T> = {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  append: (items: T[]) => void;
};

/**
 * Polls the given Edge queue.
 */
// TODO(burdon): Replace polling with socket?
export const useQueue = <T>(client: EdgeHttpClient, queueDxn?: DXN, options: UseQueueOptions = {}): Queue<T> => {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Only for initial load.
  const [error, setError] = useState<Error | null>(null);
  const refreshId = useRef<number>(0);

  const { subspaceTag, spaceId, queueId } = queueDxn?.asQueueDXN() ?? {};

  const append = async (items: T[]) => {
    if (!subspaceTag || !spaceId || !queueId) {
      return;
    }

    try {
      setItems((prevItems) => [...prevItems, ...items]);
      void client.insertIntoQueue(subspaceTag, spaceId, queueId, items);
    } catch (err) {
      setError(err as Error);
    }
  };

  const refresh = async () => {
    if (!subspaceTag || !spaceId || !queueId) {
      return;
    }

    const thisRefreshId = ++refreshId.current;
    try {
      const { objects } = await client.queryQueue(subspaceTag, spaceId, { queueId });
      if (thisRefreshId !== refreshId.current) {
        return;
      }

      setItems(objects as T[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [queueDxn?.toString()]);

  useEffect(() => {
    void refresh();
  }, [queueDxn?.toString()]);

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

  return {
    items,
    append,
    isLoading,
    error,
  };
};
