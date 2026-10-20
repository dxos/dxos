//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { JmapOperation } from '#types';

import { syncBinding } from './sync-binding.ts';

const handler = JmapOperation.LegacyJmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      const binding = yield* Database.load(bindingRef);
      if (!Cursor.isExternal(binding)) {
        log.warn('legacy jmap sync skipped: binding is not external', { binding: bindingRef.uri });
        return { newMessages: 0 };
      }

      return yield* syncBinding(binding);
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
