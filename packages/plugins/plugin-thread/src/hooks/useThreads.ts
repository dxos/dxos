//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Channel } from '@dxos/types';

import { type Thread, ThreadCapabilities, resolveProvider } from '../types';

const EMPTY: readonly Thread.Thread[] = [];

/**
 * Reactive thread list for a channel, resolved through its backend provider. Empty for backends that
 * carry no threads, where threads are inferred from replies alone.
 */
export const useThreads = (channel: Channel.Channel | undefined): readonly Thread.Thread[] => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = useMemo(
    () => (channel ? resolveProvider(providers, channel.backend.kind) : undefined),
    [providers, channel],
  );

  const ref = useRef<readonly Thread.Thread[]>(EMPTY);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider?.subscribeThreads || !channel) {
        return () => {};
      }
      return provider.subscribeThreads(channel, (threads) => {
        ref.current = threads;
        onChange();
      });
    },
    [provider, channel],
  );

  return useSyncExternalStore(subscribe, () => ref.current);
};

/** Whether a channel's backend can record threads, and so start them at all. */
export const useCanCreateThread = (channel: Channel.Channel | undefined): boolean => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  return !!provider?.appendThread;
};
