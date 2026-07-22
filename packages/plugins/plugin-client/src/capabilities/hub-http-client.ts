//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { HubHttpClient } from '@dxos/edge-client';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    if (!hubUrl) {
      return [];
    }
    return Capability.provide(ClientCapabilities.HubHttpClient, new HubHttpClient(hubUrl));
  }),
);
