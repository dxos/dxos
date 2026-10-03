//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Message } from '@dxos/types';

import { FeedModel, type FeedModelOptions } from './feed.ts';

/**
 * A feed model over a message array the host re-creates per render — the React-prop case.
 *
 * The model is stable; the array is folded into it with `replace`, which is where the prepend
 * inference lives (and the only place — SPEC F-7.1). In an effect rather than during render: the
 * model publishes synchronously to its subscribers, and a subscriber invalidating itself while the
 * host is still rendering is a cross-component update React rejects. The window it opens is one
 * frame, and the window's own subscription closes it.
 *
 * Streaming through this adapter is a `replace` whose length does not change; the model still
 * publishes, so the window still re-renders, and the streaming item reconciles by document delta
 * exactly as it would under a told update.
 */
export const useFeedModel = (
  messages: readonly Message.Message[],
  options: Omit<FeedModelOptions, 'messages'> = {},
): FeedModel => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => new FeedModel({ messages, ...options }), []);
  useEffect(() => {
    if (model.messages !== messages) {
      model.replace(messages);
    }
  }, [model, messages]);

  return model;
};
