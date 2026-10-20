//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { GoogleOperation } from '#types';

import { syncBinding } from './sync-binding.ts';

const handler = GoogleOperation.LegacyGoogleMailSync.pipe(
  Operation.withHandler(({ binding: bindingRef, userId = 'me', label = 'all' }) =>
    Effect.gen(function* () {
      const binding = yield* Database.load(bindingRef);
      if (!Cursor.isExternal(binding)) {
        log.warn('legacy google sync skipped: binding is not external', { binding: bindingRef.uri });
        return { newMessages: 0 };
      }

      return yield* syncBinding(binding, { userId, label });
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
