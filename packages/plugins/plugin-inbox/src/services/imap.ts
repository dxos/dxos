//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import type * as Scope from 'effect/Scope';
import * as Schema from 'effect/Schema';

import type { Credential } from '@dxos/compute';

import { ImapCredentials } from './imap-credentials';

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
 * A live, authenticated IMAP session returned by {@link Imap.connect}. Reads
 * are scope-managed: callers are forced to use `Effect.scoped`, which fires
 * `logout()` on success, failure, or interrupt.
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
   * Acquire an authenticated IMAP session. Scope-managed; the session is
   * closed on scope exit. Credentials come from `ImapCredentials` so callers
   * never pass them explicitly.
   */
  readonly connect: () => Effect.Effect<
    ImapConnection,
    ImapError,
    Scope.Scope | ImapCredentials | Credential.CredentialsService
  >;
};

/**
 * Effect service tag for IMAP operations. Implementations swap per runtime
 * (Workers polyfill vs. Tauri shim) without altering the operation handlers.
 */
export class Imap extends Context.Tag('@dxos/plugin-inbox/Imap')<Imap, ImapServiceShape>() {
  /** Static alias so callers can `yield* Imap.connect()` directly. */
  static readonly connect = () => Effect.flatMap(Imap, (imap) => imap.connect());
}

/**
 * Sentinel layer for runtimes where IMAP cannot be reached (plain browser
 * with no Tauri or remote function). Every `connect()` fails with
 * `ImapError({ reason: 'unavailable' })` so the credential form can render
 * a friendly fallback message instead of hanging.
 */
export const ImapUnavailable: Layer.Layer<Imap> = Layer.succeed(Imap, {
  connect: () =>
    Effect.fail(
      new ImapError({
        reason: 'unavailable',
        message: 'IMAP is unavailable in this runtime. Use the desktop app or remote functions.',
      }),
    ),
});

/** Helper for adapter implementations: extracts the redacted password value. */
export const readPassword = (auth: ImapAuthValues): string =>
  Redacted.value(auth.password as unknown as Redacted.Redacted<string>);
