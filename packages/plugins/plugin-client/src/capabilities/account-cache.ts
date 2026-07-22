//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { AccountCache, ClientCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(
      ClientCapabilities.AccountCache,
      createKvsStore<AccountCache>({
        key: 'composer.account',
        schema: AccountCache,
        defaultValue: () => ({}),
      }),
    ),
  ),
);
