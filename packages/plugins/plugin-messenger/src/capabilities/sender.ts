//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { makeSender } from '#materializer';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    return Capability.contribute(
      AppCapabilities.InboxSender,
      makeSender(() => client.halo),
    );
  }),
);
