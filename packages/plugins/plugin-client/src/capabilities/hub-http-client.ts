//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { getEnvString } from '@dxos/config';
import { HubHttpClient } from '@dxos/edge-client';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const hubUrl = getEnvString(client.config, 'DX_HUB_URL');
    if (!hubUrl) {
      return [];
    }
    return Capability.contribute(ClientCapabilities.HubHttpClient, new HubHttpClient(hubUrl));
  }),
);
