//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

// =====================================================================
// IMAP
// =====================================================================

/** Auth + connection settings for an IMAP session. */
export class ImapAuth extends Schema.Class<ImapAuth>('ImapAuth')({
  host: Schema.String,
  port: Schema.Number,
  /** True for implicit TLS (port 993); false for STARTTLS upgrade on 143. */
  secure: Schema.Boolean,
  username: Schema.String,
  password: Schema.Redacted(Schema.String),
}) {}

export interface ImapAuthValues extends Schema.Schema.Type<typeof ImapAuth> {}

export type ImapMailbox = {
  name: string;
  /** Cursor invalidator: if it changes the server has renumbered UIDs. */
  uidValidity: number;
  /** First UID we have not seen. */
  uidNext: number;
  exists: number;
};

export type ImapAddress = { name?: string; address: string };

export type ImapEnvelope = {
  uid: number;
  internalDate: Date;
  size: number;
  subject?: string;
  from: ImapAddress[];
  to: ImapAddress[];
  cc?: ImapAddress[];
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  flags: ReadonlyArray<string>;
};

export type ImapBody = {
  text?: string;
  html?: string;
  attachments: { filename?: string; contentType: string; size: number; cid?: string }[];
};

/** Tagged failure for IMAP operations. */
export class ImapError extends Schema.TaggedError<ImapError>()('ImapError', {
  reason: Schema.Literal('auth', 'connect', 'tls', 'protocol', 'timeout', 'unavailable', 'unknown'),
  message: Schema.String,
}) {}

/**
 * A live, authenticated IMAP session returned by {@link Imap.connect}. Scope-managed:
 * callers use `Effect.scoped`, which fires `logout()` on success, failure, or interrupt.
 */
export interface ImapConnection {
  readonly select: (folder: string, mode?: 'read' | 'write') => Effect.Effect<ImapMailbox, ImapError>;
  readonly searchUidsSince: (since: Date, filter?: string) => Effect.Effect<ReadonlyArray<number>, ImapError>;
  readonly searchUidsAbove: (uid: number) => Effect.Effect<ReadonlyArray<number>, ImapError>;
  readonly fetchEnvelopes: (uids: ReadonlyArray<number>) => Effect.Effect<ReadonlyArray<ImapEnvelope>, ImapError>;
  readonly fetchBody: (uid: number) => Effect.Effect<ImapBody, ImapError>;
}

export type ImapServiceShape = {
  /**
   * Acquire an authenticated IMAP session for the given auth bundle. Scope-managed; the
   * session is closed on scope exit. The handler is responsible for resolving auth from
   * its Integration before calling — this keeps the service stateless and runtime-bindable.
   */
  readonly connect: (auth: ImapAuthValues) => Effect.Effect<ImapConnection, ImapError, Scope.Scope>;
};

/**
 * Runtime-provided IMAP service. Operations declare it via `services: [Imap]`; the
 * surrounding managed runtime supplies the implementation — `ImapUnavailable` on the
 * composer side (fails-fast), `ImapLive` (via `@dxos/plugin-inbox/mail-live`) on the
 * Workers side.
 */
export class Imap extends Context.Tag('@dxos/functions/Imap')<Imap, ImapServiceShape>() {
  /** Static alias so callers can `yield* Imap.connect(auth)` directly. */
  static readonly connect = (auth: ImapAuthValues) => Effect.flatMap(Imap, (imap) => imap.connect(auth));
}

/**
 * Sentinel layer for runtimes that can't reach IMAP transport (composer, browser). Every
 * `connect()` fails with `ImapError({ reason: 'unavailable' })`. A composer-side LayerSpec
 * (contributed by `@dxos/plugin-inbox`) provides this so operations declaring
 * `services: [Imap]` resolve cleanly but fail fast at call time when executed locally.
 */
export const ImapUnavailable: Layer.Layer<Imap> = Layer.succeed(Imap, {
  connect: () =>
    Effect.fail(
      new ImapError({
        reason: 'unavailable',
        message: 'IMAP is unavailable in this runtime. Deploy as a function bundle on the edge to enable transport.',
      }),
    ),
});

/** Helper for adapter implementations: extracts the redacted password value. */
export const readImapPassword = (auth: ImapAuthValues): string =>
  Redacted.value(auth.password as unknown as Redacted.Redacted<string>);

// =====================================================================
// SMTP
// =====================================================================

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
   * Send a fully-composed RFC 5322 message via SMTP submission. The handler is responsible
   * for resolving auth from its Integration before calling — this keeps the service
   * stateless and runtime-bindable.
   */
  readonly send: (auth: SmtpAuthValues, input: SmtpSendInput) => Effect.Effect<void, SmtpError>;
};

/**
 * Runtime-provided SMTP service. Operations declare it via `services: [Smtp]`; the
 * surrounding managed runtime supplies the implementation — `SmtpUnavailable` on the
 * composer side, `SmtpLive` (via `@dxos/plugin-inbox/mail-live`) on the Workers side.
 */
export class Smtp extends Context.Tag('@dxos/functions/Smtp')<Smtp, SmtpServiceShape>() {
  /** Static alias so callers can `yield* Smtp.send(auth, input)` directly. */
  static readonly send = (auth: SmtpAuthValues, input: SmtpSendInput) =>
    Effect.flatMap(Smtp, (smtp) => smtp.send(auth, input));
}

/**
 * Sentinel layer for runtimes that can't reach SMTP transport. Mirrors {@link ImapUnavailable}.
 */
export const SmtpUnavailable: Layer.Layer<Smtp> = Layer.succeed(Smtp, {
  send: () =>
    Effect.fail(
      new SmtpError({
        reason: 'unavailable',
        message: 'SMTP is unavailable in this runtime. Deploy as a function bundle on the edge to enable transport.',
      }),
    ),
});

/** Helper for adapter implementations: extracts the redacted password value. */
export const readSmtpPassword = (auth: SmtpAuthValues): string =>
  Redacted.value(auth.password as unknown as Redacted.Redacted<string>);
