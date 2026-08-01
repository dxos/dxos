//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';

import { WnfsCapabilities } from '#types';

import * as Blockstore from '../blockstore';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    // `config` is initialized-only, and this event wave can land before the forked client
    // initialization completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    const apiHost = client.config.values.runtime?.services?.edge?.url || 'http://localhost:8787';
    const blockstore = Blockstore.create(apiHost);
    yield* Effect.tryPromise(() => blockstore.open());

    const instances: WnfsCapabilities.Instances = {};

    return [
      Capability.contribute(WnfsCapabilities.Blockstore, blockstore),
      Capability.contribute(WnfsCapabilities.Instances, instances),
    ];
  }),
);
