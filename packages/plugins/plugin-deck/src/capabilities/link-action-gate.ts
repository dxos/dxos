//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LinkAction from '@dxos/app-toolkit/LinkAction';

import { DeckCapabilities } from '#types';

import { DeckNamespace } from '../namespace.ts';

const LINK_ACTION_BUDGET = '10 seconds';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const gate = Atom.make<Capabilities.BootGateState>({
      pending: !!globalThis.location && new URL(globalThis.location.href).searchParams.has(LinkAction.PARAM),
    }).pipe(Atom.keepAlive);
    yield* Effect.forkScoped(
      Effect.sleep(LINK_ACTION_BUDGET).pipe(Effect.andThen(Effect.sync(() => registry.set(gate, { pending: false })))),
    );

    return [
      Capability.contribute(Capabilities.BootGate, { id: `${DeckNamespace.key}.bootGate.linkAction`, state: gate }),
      Capability.contribute(DeckCapabilities.LinkActionGate, gate),
    ];
  }),
);
