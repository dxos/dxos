//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Smtp, SmtpError, readSmtpPassword } from '@dxos/functions';

import { SmtpClient } from './internal/smtp-client';

const errorOf =
  (reason: 'auth' | 'connect' | 'tls' | 'protocol' | 'timeout' | 'unavailable' | 'unknown') =>
  (error: unknown): SmtpError =>
    new SmtpError({ reason, message: error instanceof Error ? error.message : String(error) });

/**
 * Workers-side `Smtp` Live layer. Opens a fresh submission session per call (acquire),
 * sends the message, then QUITs (release). Concrete service that can be dropped into a
 * managed runtime context — function-bundle entry points wire this via
 * `Layer.provideMerge(SmtpLive)`.
 */
export const SmtpLive: Layer.Layer<Smtp> = Layer.succeed(Smtp, {
  send: (auth, input) =>
    Effect.scoped(
      Effect.gen(function* () {
        const client = new SmtpClient({
          host: auth.host,
          port: auth.port,
          auth: {
            username: auth.username,
            password: readSmtpPassword(auth),
          },
        });
        yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => client.connect(),
            catch: errorOf('connect'),
          }),
          () =>
            Effect.tryPromise({
              try: () => client.quit(),
              catch: () => undefined,
            }).pipe(Effect.ignore),
        );
        yield* Effect.tryPromise({
          try: () => client.sendMessage({ from: input.from, to: [...input.to], rfc822: input.rfc822 }),
          catch: errorOf('protocol'),
        });
      }),
    ),
});
