//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useContext, useState } from 'react';

import { AiContext } from '@dxos/assistant';
import { Database, Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

export const useContextBinder = (
  space: Space | undefined,
  feed: Feed.Feed | undefined,
): AiContext.Binder | undefined => {
  const registry = useContext(RegistryContext) as Registry.Registry;
  const [binder, setBinder] = useState<AiContext.Binder>();

  useAsyncEffect(async () => {
    setBinder(undefined);
    if (!space || !feed) {
      return;
    }

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
    );
    const binder = new AiContext.Binder({ feed, runtime, registry });
    await binder.open();
    setBinder(binder);

    return () => {
      void binder.close();
    };
  }, [space, feed]);

  return binder;
};
