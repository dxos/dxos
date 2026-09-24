//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CallsCapabilities } from '#types';

import { CallManager } from '../calls/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const haloIdentity = yield* ClientCapabilities.IdentityService;
    const callManager = new CallManager(client, registry, haloIdentity);
    yield* Effect.tryPromise(() => callManager.open());

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void callManager.close();
      }),
    );
    return Capability.contribute(CallsCapabilities.Manager, callManager);
  }),
);
