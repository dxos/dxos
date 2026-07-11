//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AtprotoCapabilities } from '#types';

import * as AtprotoRepo from '../services/AtprotoRepo';

/**
 * Default (live) repo-layer factory: resolves credentials + PDS for the connection and talks to the
 * user's repo via the Edge proxy. Stories/tests override {@link AtprotoCapabilities.RepoLayer} with a
 * factory returning the in-memory mock.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    return [
      Capability.contributes(AtprotoCapabilities.RepoLayer, (connection) =>
        AtprotoRepo.layerLive({ connection: Ref.make(connection), client }),
      ),
      Capability.contributes(AtprotoCapabilities.ReadRepoLayer, (handle) => AtprotoRepo.layerPublic(handle)),
    ];
  }),
);
