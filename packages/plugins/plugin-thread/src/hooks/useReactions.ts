//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Channel, type Reaction } from '@dxos/types';

import { ThreadCapabilities, resolveProvider } from '../types';

const EMPTY: readonly Reaction.Reaction[] = [];

/**
 * Reactive reaction list for a channel, resolved through its backend provider. Empty for backends
 * that carry no reactions (a bridged channel), which is what hides the affordance.
 */
export const useReactions = (channel: Channel.Channel | undefined): readonly Reaction.Reaction[] => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = useMemo(
    () => (channel ? resolveProvider(providers, channel.backend.kind) : undefined),
    [providers, channel],
  );

  const ref = useRef<readonly Reaction.Reaction[]>(EMPTY);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider?.subscribeReactions || !channel) {
        return () => {};
      }
      return provider.subscribeReactions(channel, (reactions) => {
        ref.current = reactions;
        onChange();
      });
    },
    [provider, channel],
  );

  return useSyncExternalStore(subscribe, () => ref.current);
};

/** Whether a channel's backend supports reacting at all. */
export const useCanReact = (channel: Channel.Channel | undefined): boolean => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  return !!provider?.appendReaction && !!provider?.removeReaction;
};

/** Whether a channel's backend can delete messages. */
export const useCanRemove = (channel: Channel.Channel | undefined): boolean => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = channel ? resolveProvider(providers, channel.backend.kind) : undefined;
  return !!provider?.remove;
};
