//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { raise } from '@dxos/debug';
import type { Queue } from '@dxos/client/echo';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { useClient } from '../client';

const MIN_POLL_INTERVAL = 1_000;

export type UseQueueOptions = {
  pollInterval?: number;
};

/**
 * Polls the given Edge queue.
 */
// TODO(burdon): Replace polling with socket?
// TODO(dmaretskyi): Move into client package.
// TODO(dmaretskyi): Consider passing the space into the hook to support queue DXNs without space id.
export const useQueue = <T extends BaseEchoObject>(
  queueDxn?: DXN,
  options: UseQueueOptions = {},
): Queue<T> | undefined => {
  const client = useClient();
  const queue = useMemo<Queue<T> | undefined>(() => {
    if (!queueDxn) {
      return undefined;
    }

    const { spaceId } = queueDxn.asQueueDXN() ?? raise(new TypeError('Invalid queue DXN'));

    return client.spaces.get(spaceId)?.queues.get<T>(queueDxn);
  }, [client, queueDxn?.toString()]);

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
