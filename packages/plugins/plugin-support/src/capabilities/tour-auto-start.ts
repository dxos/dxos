//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Account from '@dxos/plugin-client/Account';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { HelpCapabilities, HelpOperation } from '#types';

/** Runs a matching `auto` tour the first time the reader attends something it applies to. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    if (!Account.isAuthEnabled(client.config)) {
      return [];
    }

    const registry = yield* Capabilities.AtomRegistry;
    const operationInvoker = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const attention = yield* AttentionCapabilities.Attention;
    const stateAtom = yield* HelpCapabilities.State;
    const toursAtom = yield* Capability.atom(AppCapabilities.Tour);

    const attendedAtom = Atom.make<string | undefined>(attention.getCurrent()[0]);
    const unsubscribeAttention = attention.subscribeCurrent((current) => registry.set(attendedAtom, current[0]));

    const nextTourAtom = Atom.make((get) => {
      const attendedId = get(attendedAtom);
      const state = get(stateAtom);
      if (!attendedId || state.running) {
        return undefined;
      }

      const data = Option.getOrUndefined(get(graph.node(attendedId)))?.data;
      if (data === undefined) {
        return undefined;
      }

      const unseen = get(toursAtom).filter((tour) => tour.auto && !state.seenTours.includes(tour.id));
      return Tour.matching(unseen, data)[0]?.id;
    });

    const unsubscribeTour = registry.subscribe(
      nextTourAtom,
      (tourId) => {
        if (tourId) {
          void operationInvoker.invokePromise(HelpOperation.StartTour, { tourId });
        }
      },
      { immediate: true },
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeTour();
        unsubscribeAttention();
      }),
    );
    return [];
  }),
);
