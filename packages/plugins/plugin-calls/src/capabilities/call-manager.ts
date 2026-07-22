//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallsCapabilities } from '#types';

import { CallManager } from '../calls';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const haloIdentity = yield* ClientCapabilities.IdentityService;
    const callManager = new CallManager(client, registry, haloIdentity);
    yield* Effect.tryPromise(() => callManager.open());

    return Capability.provide(CallsCapabilities.Manager, callManager, () =>
      Effect.sync(() => {
        void callManager.close();
      }),
    );
  }),
);
