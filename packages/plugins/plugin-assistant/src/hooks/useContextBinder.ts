//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useContext, useState } from 'react';

import { AiContextBinder } from '@dxos/assistant';
import { Feed } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

export const useContextBinder = (space: Space | undefined, feed: Feed.Feed | undefined): AiContextBinder | undefined => {
  const registry = useContext(RegistryContext) as Registry.Registry;
  const [binder, setBinder] = useState<AiContextBinder>();

  useAsyncEffect(async () => {
    if (!space || !feed) {
      return;
    }

    const feedServiceLayer = createFeedServiceLayer(space.queues);
    const feedRuntime = await runAndForwardErrors(
      Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer)),
    );
    const binder = new AiContextBinder({ feed, feedRuntime, registry });
    await binder.open();
    setBinder(binder);

    return () => {
      void binder.close();
    };
  }, [space, feed]);

  return binder;
};
