//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { AccountCache, ClientCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      ClientCapabilities.AccountCache,
      KvsStore.make<AccountCache.AccountCache>({
        key: 'composer.account',
        schema: AccountCache.AccountCache,
        defaultValue: () => ({}),
      }),
    ),
  ),
);
