//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import * as Blockstore from '../../blockstore';
import { WnfsCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const apiHost = client.config.values.runtime?.services?.edge?.url || 'http://localhost:8787';
    const blockstore = Blockstore.create(apiHost);
    yield* Effect.tryPromise(() => blockstore.open());

    return Capability.contributes(WnfsCapabilities.Blockstore, blockstore);
  }),
);
