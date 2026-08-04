//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';

import { ClientCapabilities } from '#types';

import * as AccountCache from '../types/AccountCache';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      ClientCapabilities.AccountCache,
      createKvsStore<AccountCache.AccountCache>({
        key: 'composer.account',
        schema: AccountCache.AccountCache,
        defaultValue: () => ({}),
      }),
    ),
  ),
);
