//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { AtprotoCapabilities } from '#types';
import { AtprotoEvents } from '#types';

import * as AtprotoRepo from '../services/AtprotoRepo.ts';

export const RepoLayer = Capability.makeModule(
  'RepoLayer',
  {
    requires: [ClientCapabilities.Client],
    provides: [AtprotoCapabilities.RepoLayer, AtprotoCapabilities.ReadRepoLayer],
    activatesOn: AtprotoEvents.Start,
  },
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
