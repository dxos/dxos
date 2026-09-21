//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

import { WnfsCapabilities } from '#types';

import * as Blockstore from '../blockstore.ts';

export const Dependencies = Capability.makeModule(
  'Dependencies',
  {
    requires: [ClientCapabilities.Client],
    // The file plugin's start, not wnfs's own: wnfs contributes no surface, so nothing would
    // ever fire its own start — and these are exactly what the blob backend above waits for.
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    activatesOn: FileEvents.Start,
  },
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    // `config` is initialized-only, and this event wave can land before the forked client
    // initialization completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    const apiHost = client.config.values.runtime?.services?.edge?.url;
    if (!apiHost) {
      // WNFS stores blocks on edge; without an endpoint the module contributes nothing.
      log('wnfs blockstore disabled: EDGE services not configured');
      return [];
    }
    const blockstore = Blockstore.create(apiHost);
    yield* Effect.tryPromise(() => blockstore.open());

    const instances: WnfsCapabilities.Instances = {};

    return [
      Capability.contribute(WnfsCapabilities.Blockstore, blockstore),
      Capability.contribute(WnfsCapabilities.Instances, instances),
    ];
  }),
);
