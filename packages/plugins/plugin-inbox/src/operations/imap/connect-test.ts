//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { ImapLive } from '../../apis';
import { Imap, ImapCredentials } from '../../services';
import { ImapTestConnection } from '../definitions';

/**
 * Connect → SELECT INBOX → logout. Surfaces auth/TLS/protocol errors before
 * a full sync, used by the credential form's "Test connection" button.
 */
export default ImapTestConnection.pipe(
  Operation.withHandler(({ integration: integrationRef, folder = 'INBOX' }) =>
    Effect.gen(function* () {
      const conn = yield* Imap.connect();
      const box = yield* conn.select(folder, 'read');
      log('imap test connection ok', {
        host: box.name,
        uidValidity: box.uidValidity,
        exists: box.exists,
      });
      return {
        ok: true as const,
        folder: box.name,
        uidValidity: box.uidValidity,
        exists: box.exists,
      };
    }).pipe(
      Effect.scoped,
      Effect.provide(Layer.provide(ImapLive, ImapCredentials.fromIntegration(integrationRef))),
      Effect.catchTag('ImapError', (error) =>
        Effect.succeed({
          ok: false as const,
          reason: error.reason,
          message: error.message,
          folder: undefined,
          uidValidity: undefined,
          exists: undefined,
        }),
      ),
    ),
  ),
);
