//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { ClientCapabilities } from '#types';

import { AccountCache } from '../state/account-cache';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      ClientCapabilities.AccountCache,
      createKvsStore<AccountCache>({
        key: 'composer.account',
        schema: AccountCache,
        defaultValue: () => ({}),
      }),
    ),
  ),
);
