//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Smtp, SmtpError, readSmtpPassword } from '../smtp';
import { SmtpCredentials } from '../smtp-credentials';

import { SmtpClient } from './internal/smtp-client';

const errorOf =
  (reason: 'auth' | 'connect' | 'tls' | 'protocol' | 'timeout' | 'unavailable' | 'unknown') =>
  (error: unknown): SmtpError =>
    new SmtpError({ reason, message: error instanceof Error ? error.message : String(error) });

/**
 * Workers-side SMTP Live layer backed by `cloudflare:sockets`. Each call to
 * `Smtp.send(...)` opens a fresh submission session (acquire), sends the message,
 * and QUITs (release). Credentials come from the surrounding `SmtpCredentials`
 * layer (typically `SmtpCredentials.fromIntegration`).
 */
export const SmtpLive: Layer.Layer<Smtp, never, SmtpCredentials> = Layer.effect(
  Smtp,
  Effect.gen(function* () {
    const credentials = yield* SmtpCredentials;
    return Smtp.of({
      send: (input) =>
        Effect.scoped(
          Effect.gen(function* () {
            const auth = yield* credentials.get();
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
  }),
);
