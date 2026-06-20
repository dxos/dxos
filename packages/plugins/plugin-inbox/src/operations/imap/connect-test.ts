//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Imap } from '@dxos/functions';
import { log } from '@dxos/log';

import { resolveImapAuth } from '../../services/imap-credentials';
import { InboxOperation } from '../../types';

/**
 * Connect → SELECT INBOX → logout. Surfaces auth/TLS/protocol errors before
 * a full sync, used by the credential form's "Test connection" button.
 *
 * `Imap` is provided by the surrounding managed runtime (composer wires
 * `ImapUnavailable`, Workers bundles wire `ImapLive`). Declared as a required
 * service on the operation definition so the OperationInvoker resolves it
 * from the per-space runtime context.
 */
export default InboxOperation.ImapTestConnection.pipe(
  Operation.withHandler(({ integration: integrationRef, folder = 'INBOX' }) =>
    Effect.gen(function* () {
      const auth = yield* resolveImapAuth(integrationRef);
      const conn = yield* Imap.connect(auth);
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
