//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallManager } from '../../calls';
import { ThreadCapabilities } from '../../types';

export default Capability.makeModule((context: Capability.PluginContext) =>
  Effect.gen(function* () {
    const client = context.getCapability(ClientCapabilities.Client);
    const callManager = new CallManager(client);
    yield* Effect.tryPromise(() => callManager.open());

    return Capability.contributes(ThreadCapabilities.CallManager, callManager, () =>
      Effect.sync(() => {
        void callManager.close();
      }),
    );
  }),
);
