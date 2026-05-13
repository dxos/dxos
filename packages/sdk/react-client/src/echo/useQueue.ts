//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useRef } from 'react';

import { type Queue } from '@dxos/client/echo';
import { type Entity } from '@dxos/echo';
import { EchoId } from '@dxos/keys';

import { useClient } from '../client';

const MIN_POLL_INTERVAL = 1_000;

export type UseQueueOptions = {
  pollInterval?: number;
};

/**
 * Polls the given Edge queue.
 * @deprecated Use `useQuery` instead.
 */
// TODO(burdon): Replace polling with socket?
// TODO(dmaretskyi): Move into client package.
// TODO(dmaretskyi): Consider passing the space into the hook to support queue DXNs without space id.
// TODO(ZaymonFC): If queue is unchanged returned object should be refferentially stable on poll.
export const useQueue = <T extends Entity.Unknown>(
  queueEchoId?: EchoId.EchoId,
  options: UseQueueOptions = {},
): Queue<T> | undefined => {
  const client = useClient();
  const mountedRef = useRef(true);

  const queue = useMemo<Queue<T> | undefined>(() => {
    if (!queueEchoId) {
      return undefined;
    }

    const spaceId = EchoId.getSpaceId(queueEchoId);
    if (!spaceId) {
      return undefined;
    }
    return client.spaces.get(spaceId)?.queues.get<T>(queueEchoId);
  }, [client, queueEchoId]);

  useEffect(() => {
    void queue?.refresh();
  }, [queue]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    mountedRef.current = true;

    const poll = () => {
      if (!mountedRef.current) {
        return;
      }

      void queue?.refresh().finally(() => {
        if (mountedRef.current && options.pollInterval) {
          timeout = setTimeout(poll, Math.max(options.pollInterval ?? 0, MIN_POLL_INTERVAL));
        }
      });
    };

    if (options.pollInterval) {
      poll();
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
    };
  }, [queue, options.pollInterval]);

  return queue;
};
