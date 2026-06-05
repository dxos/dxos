//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Channel, type Message } from '@dxos/types';

import { ThreadCapabilities, resolveProvider } from '../types';

const EMPTY: readonly Message.Message[] = [];

/** Reactive message list for a channel, resolved through its backend provider. */
export const useMessages = (channel: Channel.Channel): readonly Message.Message[] => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = useMemo(() => resolveProvider(providers, channel.backend.kind), [providers, channel.backend.kind]);

  const ref = useRef<readonly Message.Message[]>(EMPTY);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider) {
        return () => {};
      }
      return provider.subscribe(channel, (messages) => {
        ref.current = messages;
        onChange();
      });
    },
    [provider, channel],
  );

  return useSyncExternalStore(subscribe, () => ref.current);
};
