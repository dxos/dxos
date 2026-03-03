//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallManager } from '../../calls';
import { ThreadCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const callManager = new CallManager(client, registry);
    yield* Effect.tryPromise(() => callManager.open());

    return Capability.contributes(ThreadCapabilities.CallManager, callManager, () =>
      Effect.sync(() => {
        void callManager.close();
      }),
    );
  }),
);
