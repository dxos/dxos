//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { Queue } from '@dxos/echo-db';
import { QueueImpl } from '@dxos/echo-db';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type DXN } from '@dxos/keys';

const MIN_POLL_INTERVAL = 1_000;

export type UseQueueOptions = {
  pollInterval?: number;
};

/**
 * Polls the given Edge queue.
 */
// TODO(burdon): Replace polling with socket?
export const useQueue = <T>(
  client: EdgeHttpClient,
  queueDxn?: DXN,
  options: UseQueueOptions = {},
): Queue<T> | undefined => {
  const queue = useMemo<QueueImpl<T> | undefined>(
    () => (queueDxn ? new QueueImpl(client, queueDxn) : undefined),
    [client, queueDxn?.toString()],
  );

  useEffect(() => {
    void queue?.refresh();
  }, [queue]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (options.pollInterval) {
      const poll = () => {
        void queue?.refresh().finally(() => {
          timeout = setTimeout(poll, Math.max(options.pollInterval ?? 0, MIN_POLL_INTERVAL));
        });
      };

      poll();
    }

    return () => clearTimeout(timeout);
  }, [queue, options.pollInterval]);

  return queue;
};
