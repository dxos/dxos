//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { type Obj } from '@dxos/echo';
import * as KvsStore from '@dxos/effect/KvsStore';

import { meta } from '#meta';
import { AssistantCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // NOTE: This needs to be a chat object rather than a string id to avoid a query race.
    // TODO(wittjosiah): Handle serialization and hydration for this so it can be cached.
    const stateAtom = KvsStore.make({
      key: `${meta.profile.key}.state`,
      schema: AssistantCapabilities.StateSchema,
      defaultValue: () => ({
        currentChat: {},
        pendingPrompts: {},
      }),
    });

    const companionChatCacheAtom = Atom.make<Record<string, Obj.Unknown | undefined>>({}).pipe(Atom.keepAlive);

    const homeSuggestionsCacheAtom = KvsStore.make({
      key: `${meta.profile.key}.home-suggestions`,
      schema: AssistantCapabilities.HomeSuggestionsCacheSchema,
      defaultValue: () => ({}),
    });

    return [
      Capability.contribute(AssistantCapabilities.State, stateAtom),
      Capability.contribute(AssistantCapabilities.CompanionChatCache, companionChatCacheAtom),
      Capability.contribute(AssistantCapabilities.HomeSuggestionsCache, homeSuggestionsCacheAtom),
    ];
  }),
);
