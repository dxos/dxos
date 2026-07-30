//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Channel, type ThreadRoot } from '@dxos/types';

import { ThreadCapabilities, resolveProvider } from '../types';

const NO_THREAD_ROOTS: readonly ThreadRoot.ThreadRoot[] = [];

/**
 * Reactive thread declarations for a channel, resolved through its backend provider. Empty for
 * backends that cannot record them, where threads are inferred from replies alone.
 */
export const useThreadRoots = (channel: Channel.Channel | undefined): readonly ThreadRoot.ThreadRoot[] => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = useMemo(
    () => (channel ? resolveProvider(providers, channel.backend.kind) : undefined),
    [providers, channel],
  );

  const ref = useRef<readonly ThreadRoot.ThreadRoot[]>(NO_THREAD_ROOTS);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider?.subscribeThreadRoots || !channel) {
        return () => {};
      }
      return provider.subscribeThreadRoots(channel, (declarations) => {
        ref.current = declarations;
        onChange();
      });
    },
    [provider, channel],
  );

  return useSyncExternalStore(subscribe, () => ref.current);
};

/** Whether a channel's backend can record thread declarations, and so start threads at all. */
export const useCanCreateThread = (channel: Channel.Channel | undefined): boolean => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  return !!provider?.appendThreadRoot;
};
