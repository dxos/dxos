//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Blob } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { FileCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeUrl) {
      return Capability.contributes(Capabilities.Null, null);
    }

    return Capability.contributes(FileCapabilities.Backend, {
      name: 'Edge',
      description: 'Store files on the DXOS edge network. Scales beyond the inline size cap.',
      storage: Blob.Storage.edge,
    });
  }),
);
