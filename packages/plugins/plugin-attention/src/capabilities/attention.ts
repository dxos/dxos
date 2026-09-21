//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Attention, ViewState, createDefaultBackends } from '@dxos/react-ui-attention/types';

import { AttentionCapabilities } from '#types';

export const AttentionModule = Capability.makeModule(
  'attention',
  {
    // App-shell state, so it must be on the startup pass rather than the idle default: the deck
    // and its planks read it through the STRICT `useCapability` hooks during their first render,
    // where a missing capability is an invariant violation and not a late-arriving value.
    activatesOn: ActivationEvents.Startup,
    requires: [Capabilities.AtomRegistry],
    provides: [AttentionCapabilities.Attention, AttentionCapabilities.ViewState],
  },
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const attention = new Attention.AttentionManager(registry);
    const viewState = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
    setupDevtools(attention);
    return [
      Capability.contribute(AttentionCapabilities.Attention, attention),
      Capability.contribute(AttentionCapabilities.ViewState, viewState),
    ];
  }),
);

const setupDevtools = (attention: Attention.AttentionManager) => {
  (globalThis as any).composer ??= {};

  (globalThis as any).composer.attention = {
    get manager() {
      return attention;
    },
    get attended() {
      return attention.getCurrent();
    },
    get currentSpace() {
      for (const id of attention.getCurrent()) {
        const segments = id.split('/');
        if (segments.length > 1 && segments[1].length === 33) {
          return segments[1];
        }
      }
    },
  };
};
