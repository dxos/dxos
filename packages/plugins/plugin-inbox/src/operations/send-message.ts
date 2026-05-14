//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';

import { IMAP_PROVIDER_ID } from '../constants';
import { SendMessage } from './definitions';

/**
 * Provider-agnostic send dispatcher. Mirrors `SyncMailbox`: branches on
 * `integration.providerId` and forwards to the appropriate provider-specific
 * send operation (Gmail or SMTP) on the per-space compute runtime.
 */
const handler: Operation.WithHandler<typeof SendMessage> = SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const integration = yield* Database.load(input.integration).pipe(
        Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
      );

      const db = Obj.getDatabase(integration);
      invariant(db);

      const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const runtime = computeRuntime.getRuntime(db.spaceId);

      log('send-message dispatch', { providerId: integration.providerId });

      if (integration.providerId === IMAP_PROVIDER_ID) {
        const { SmtpFunctions } = yield* Effect.promise(() => import('./smtp'));
        return yield* Effect.tryPromise(() =>
          runtime.runPromise(
            Operation.invoke(SmtpFunctions.Send, {
              integration: input.integration,
              message: input.message,
            }),
          ),
        );
      }

      const { GmailFunctions } = yield* Effect.promise(() => import('./google/gmail'));
      return yield* Effect.tryPromise(() =>
        runtime.runPromise(
          Operation.invoke(GmailFunctions.Send, {
            integration: input.integration,
            message: input.message,
          }),
        ),
      );
    }),
  ),
);

export default handler;
