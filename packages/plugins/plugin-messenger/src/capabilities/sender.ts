//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { makeSender } from '#materializer';
import { MessengerCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    return Capability.contribute(
      MessengerCapabilities.Sender,
      makeSender(() => client.halo),
    );
  }),
);
