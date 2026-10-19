//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import { useContext, useState } from 'react';

import { AiContext } from '@dxos/assistant';
import { Database, Feed } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Space } from '@dxos/react-client/echo';
import * as Hooks from '@dxos/react-ui/Hooks';

export const useContextBinder = (
  space: Space | undefined,
  feed: Feed.Feed | undefined,
): AiContext.Binder | undefined => {
  const registry = useContext(RegistryContext) as Registry.AtomRegistry;
  const [binder, setBinder] = useState<AiContext.Binder>();

  Hooks.useAsyncEffect(async () => {
    setBinder(undefined);
    if (!space || !feed) {
      return;
    }

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
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
