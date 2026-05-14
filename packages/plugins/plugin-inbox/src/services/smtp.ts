//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

/** Auth + connection settings for an SMTP submission session. */
export class SmtpAuth extends Schema.Class<SmtpAuth>('SmtpAuth')({
  host: Schema.String,
  /** 465 = implicit TLS; 587 = STARTTLS upgrade. */
  port: Schema.Literal(465, 587),
  username: Schema.String,
  password: Schema.Redacted(Schema.String),
}) {}

export interface SmtpAuthValues extends Schema.Schema.Type<typeof SmtpAuth> {}

/** Tagged failure for SMTP operations. */
export class SmtpError extends Schema.TaggedError<SmtpError>()('SmtpError', {
  reason: Schema.Literal('auth', 'connect', 'tls', 'protocol', 'timeout', 'unavailable', 'unknown'),
  message: Schema.String,
}) {}

/** Envelope + RFC 5322 payload passed to {@link Smtp.send}. */
export type SmtpSendInput = {
  /** Bare email used in the `MAIL FROM` envelope. */
  from: string;
  /** Bare emails used in `RCPT TO` (recipients in To/Cc/Bcc collapsed into one list). */
  to: ReadonlyArray<string>;
  /** Fully composed RFC 5322 message (headers + blank line + body). */
  rfc822: string;
};

export type SmtpServiceShape = {
  /**
   * Send a fully-composed RFC 5322 message via SMTP submission. Implementations
   * open a session per call (acquire-release lifecycle managed by the Layer).
   */
  readonly send: (input: SmtpSendInput) => Effect.Effect<void, SmtpError>;
};

/**
 * Effect service tag for SMTP submission. Implementation lives in
 * `@dxos/functions-runtime-cloudflare` (`SmtpLive`) and is provided at the
 * Workers runtime layer in compute-intrinsics.
 */
export class Smtp extends Context.Tag('@dxos/plugin-inbox/Smtp')<Smtp, SmtpServiceShape>() {
  /** Static alias so callers can `yield* Smtp.send(...)` directly. */
  static readonly send = (input: SmtpSendInput) => Effect.flatMap(Smtp, (smtp) => smtp.send(input));
}

/**
 * Sentinel layer for runtimes where SMTP cannot be reached (browser without
 * remote functions). Every `send()` fails with `SmtpError({ reason: 'unavailable' })`.
 */
export const SmtpUnavailable: Layer.Layer<Smtp> = Layer.succeed(Smtp, {
  send: () =>
    Effect.fail(
      new SmtpError({
        reason: 'unavailable',
        message: 'SMTP is unavailable in this runtime. Send routes through the edge function runtime.',
      }),
    ),
});

/** Helper for adapter implementations: extracts the redacted password value. */
export const readSmtpPassword = (auth: SmtpAuthValues): string =>
  Redacted.value(auth.password as unknown as Redacted.Redacted<string>);
