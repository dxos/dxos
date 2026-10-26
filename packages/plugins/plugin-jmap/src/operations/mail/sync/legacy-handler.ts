//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';

import { JmapOperation } from '#types';

import { syncBinding } from './sync-binding.ts';

const handler = JmapOperation.LegacyJmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      // A deleted binding or Mailbox is skipped, as `Binding.syncAll` does, rather than failing every fire.
      const binding = yield* Database.load(bindingRef).pipe(
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)),
      );
      if (!binding || !Cursor.isExternal(binding) || !(yield* Binding.hasTarget(binding))) {
        log.warn('legacy jmap sync skipped: binding is gone or not external', { binding: bindingRef.uri });
        return { newMessages: 0 };
      }

      return yield* syncBinding(binding);
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
