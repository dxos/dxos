//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { InboxOperation, Mailbox } from '../types';

/**
 * Unsubscribes from a bulk sender: adds a skip-sender filter to the mailbox (hides existing + future
 * mail) and, when the `List-Unsubscribe` header exposes an HTTP target, fires the RFC 8058 one-click
 * POST (`List-Unsubscribe=One-Click`). The HTTP request is best-effort — a failure never blocks the
 * local filter. A mailto-only affordance can't be one-clicked, so only the filter is applied.
 */
const handler = InboxOperation.UnsubscribeSender.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, email, unsubscribe }) {
      const mailbox = yield* Database.load(mailboxRef);
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return { filtered: false, unsubscribed: false };
      }

      // Local skip filter — hides the sender across the UI / analysis (idempotent).
      Mailbox.ignoreSender(mailbox, email);
      yield* Effect.promise(() => db.flush());

      // Fire the one-click POST when an HTTP target exists (RFC 8058); best-effort, fire-and-forget.
      // `mode: 'no-cors'` — the unsubscribe endpoint is a third-party origin that returns no
      // `Access-Control-Allow-Origin`, so a normal fetch is blocked by CORS (and logs a console error)
      // even though the local skip filter above already suppresses the sender. A one-click POST needs no
      // response body, and its `Content-Type: application/x-www-form-urlencoded` is CORS-safelisted, so a
      // no-cors request is dispatched to the server without preflight. The response is opaque (unreadable
      // `ok`/`status`), so a non-throwing completion is reported as dispatched.
      const { http } = Mailbox.parseUnsubscribe(unsubscribe);
      const unsubscribed = http
        ? yield* Effect.tryPromise(() =>
            fetch(http, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: 'List-Unsubscribe=One-Click',
            }).then(() => true),
          ).pipe(Effect.orElse(() => Effect.succeed(false)))
        : false;

      return { filtered: true, unsubscribed };
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
