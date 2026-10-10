//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Blob } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { FileCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    // `config` is initialized-only, and this event wave can land before the forked client
    // initialization completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    // `@dxos/client` registers the backend either way: it stores bytes on this device first and
    // uses the edge, when configured, as the copy other devices fetch from.
    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    return Capability.contribute(FileCapabilities.Backend, {
      name: 'Blob Service',
      description: edgeUrl
        ? 'Store files on this device and sync them to the DXOS edge network. Scales beyond the inline size cap.'
        : 'Store files on this device, outside the space. Other devices cannot fetch them until an edge network is configured.',
      storage: Blob.Storage.edge,
    });
  }),
);
