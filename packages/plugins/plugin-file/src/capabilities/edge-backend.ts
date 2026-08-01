//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Blob } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { FileCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    // `config` is initialized-only, and this event wave can land before the forked client
    // initialization completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeUrl) {
      // No edge service configured — skip the declared provide (runtime warns, not fails).
      return [];
    }

    return Capability.contribute(FileCapabilities.Backend, {
      name: 'Edge',
      description: 'Store files on the DXOS edge network. Scales beyond the inline size cap.',
      storage: Blob.Storage.edge,
    });
  }),
);
