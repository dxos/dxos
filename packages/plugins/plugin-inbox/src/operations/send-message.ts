//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { IMAP_PROVIDER_ID } from '../constants';
import { InboxOperation } from '../types';

/**
 * Provider-agnostic send dispatcher. Branches on `integration.providerId`
 * and forwards to the appropriate provider-specific send operation (Gmail
 * or SMTP) via `Operation.invoke`, which uses the surrounding runtime context.
 */
const handler: Operation.WithHandler<typeof InboxOperation.SendMessage> = InboxOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const integration = yield* Database.load(input.integration).pipe(
        Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
      );

      const db = Obj.getDatabase(integration);
      invariant(db);

      log('send-message dispatch', { providerId: integration.providerId });

      if (integration.providerId === IMAP_PROVIDER_ID) {
        return yield* Operation.invoke(InboxOperation.SmtpSend, {
          integration: input.integration,
          message: input.message,
        });
      }

      return yield* Operation.invoke(InboxOperation.GmailSend, {
        integration: input.integration,
        message: input.message,
      });
    }),
  ),
);

export default handler;
