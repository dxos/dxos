//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { AtprotoCapabilities } from '#types';

import * as AtprotoRepo from '../services/AtprotoRepo.ts';

/**
 * Default (live) repo-layer factory: resolves credentials + PDS for the connection and talks to the
 * user's repo via the Edge proxy. Stories/tests override {@link AtprotoCapabilities.RepoLayer} with a
 * factory returning the in-memory mock.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    return [
      Capability.contribute(AtprotoCapabilities.RepoLayer, (connection) =>
        AtprotoRepo.layerLive({ connection: Ref.make(connection), client }),
      ),
      Capability.contribute(AtprotoCapabilities.ReadRepoLayer, (handle) => AtprotoRepo.layerPublic(handle)),
    ];
  }),
);
