//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { Credential } from '@dxos/compute';
import { log } from '@dxos/log';

import {
  Imap,
  ImapCredentials,
  ImapError,
  readPassword,
  type ImapAddress,
  type ImapBody,
  type ImapConnection,
  type ImapEnvelope,
  type ImapMailbox,
} from '../../services';

/**
 * Maps an arbitrary thrown value (typically from `imapflow`) onto an
 * {@link ImapError}. Recognises imapflow's documented error codes; falls
 * back to `'unknown'` for anything else so we never lose context.
 */
const mapError = (cause: unknown): ImapError => {
  if (cause instanceof ImapError) {
    return cause;
  }
  const err = cause as { code?: string; authenticationFailed?: boolean; serverResponseCode?: string; message?: string };
  const message = err?.message ?? String(cause);
  if (err?.authenticationFailed === true || err?.code === 'AUTHENTICATIONFAILED') {
    return new ImapError({ reason: 'auth', message });
  }
  if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED' || err?.code === 'ECONNRESET') {
    return new ImapError({ reason: 'connect', message });
  }
  if (err?.code === 'CERT_HAS_EXPIRED' || err?.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || err?.code === 'EPROTO') {
    return new ImapError({ reason: 'tls', message });
  }
  if (err?.code === 'ETIMEDOUT' || err?.code === 'IDLETIMEOUT') {
    return new ImapError({ reason: 'timeout', message });
  }
  if (err?.serverResponseCode === 'NO' || err?.serverResponseCode === 'BAD') {
    return new ImapError({ reason: 'protocol', message });
  }
  return new ImapError({ reason: 'unknown', message });
};

const tryImap = <A>(thunk: () => Promise<A>): Effect.Effect<A, ImapError> =>
  Effect.tryPromise({ try: thunk, catch: mapError });

const toAddresses = (entries: ReadonlyArray<{ name?: string; address?: string }> | undefined): ImapAddress[] =>
  (entries ?? []).filter((entry) => typeof entry.address === 'string').map((entry) => ({
    name: entry.name,
    address: entry.address as string,
  }));

/**
 * Builds an {@link ImapConnection} bound to a connected `imapflow` client.
 * Pure data-plane: connection lifecycle is owned by the layer factory below.
 */
const makeConnection = (client: any): ImapConnection => ({
  select: (folder, mode = 'read') =>
    tryImap(async () => {
      const box = await client.mailboxOpen(folder, { readOnly: mode === 'read' });
      const mailbox: ImapMailbox = {
        name: box.path,
        uidValidity: Number(box.uidValidity),
        uidNext: Number(box.uidNext),
        exists: Number(box.exists ?? 0),
      };
      return mailbox;
    }),
  searchUidsSince: (since, filter) =>
    tryImap(async () => {
      const query: Record<string, unknown> = { since };
      if (filter) {
        // imapflow supports header / text matchers via specific keys; fall
        // back to subject substring if the caller passes a free-text filter.
        query.text = filter;
      }
      const result = (await client.search(query, { uid: true })) as ReadonlyArray<number> | false;
      return Array.isArray(result) ? result : [];
    }),
  searchUidsAbove: (uid) =>
    tryImap(async () => {
      const result = (await client.search({ uid: `${uid + 1}:*` }, { uid: true })) as ReadonlyArray<number> | false;
      return Array.isArray(result) ? result : [];
    }),
  fetchEnvelopes: (uids) =>
    tryImap(async () => {
      if (uids.length === 0) {
        return [];
      }
      const envelopes: ImapEnvelope[] = [];
      const range = uids.join(',');
      for await (const item of client.fetch(
        range,
        { envelope: true, flags: true, internalDate: true, size: true },
        { uid: true },
      )) {
        const envelope = item.envelope ?? {};
        envelopes.push({
          uid: Number(item.uid),
          internalDate: item.internalDate ? new Date(item.internalDate) : new Date(0),
          size: Number(item.size ?? 0),
          subject: envelope.subject,
          from: toAddresses(envelope.from),
          to: toAddresses(envelope.to),
          cc: envelope.cc ? toAddresses(envelope.cc) : undefined,
          messageId: envelope.messageId,
          inReplyTo: envelope.inReplyTo,
          references: envelope.references ? envelope.references.split(/\s+/).filter(Boolean) : undefined,
          flags: Array.from(item.flags ?? []),
        });
      }
      return envelopes;
    }),
  fetchBody: (uid) =>
    Effect.gen(function* () {
      const sourceBuffer = yield* tryImap(async () => {
        const result = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!result?.source) {
          throw new Error(`No source returned for uid ${uid}`);
        }
        return result.source as Uint8Array;
      });
      // postal-mime is loaded lazily so that runtimes that never call
      // fetchBody don't pay its bundle cost (and so unit tests can stub it).
      const { default: PostalMime } = yield* Effect.tryPromise({
        try: () => import('postal-mime'),
        catch: mapError,
      });
      const parsed = yield* tryImap(() => PostalMime.parse(sourceBuffer));
      const attachments = (parsed.attachments ?? []).map((attachment: any) => ({
        filename: attachment.filename ?? undefined,
        contentType: attachment.mimeType ?? 'application/octet-stream',
        size: typeof attachment.content?.byteLength === 'number' ? attachment.content.byteLength : 0,
        cid: attachment.contentId ?? undefined,
      }));
      const body: ImapBody = {
        text: parsed.text ?? undefined,
        html: parsed.html ?? undefined,
        attachments,
      };
      return body;
    }),
});

/**
 * Single Effect Layer wrapping `imapflow`. Same code in every runtime — the
 * runtime-specific bit (`node:net`/`node:tls`) is supplied by the bundler:
 * Cloudflare's `nodejs_compat` polyfill on Workers, the in-tree shim on
 * Tauri, nothing in plain browsers (where the import will fail and the
 * adapter surfaces `ImapError({ reason: 'unavailable' })`).
 *
 * Credentials are resolved when the Layer is built (`Layer.effect` captures
 * `ImapCredentials` at construction time), so `Imap.connect()` Effects only
 * expose `Scope.Scope` in their requirement channel — much friendlier to
 * the operation framework's strict service typing.
 */
export const ImapLive: Layer.Layer<Imap, ImapError, ImapCredentials | Credential.CredentialsService> = Layer.effect(
  Imap,
  Effect.gen(function* () {
    // Resolve auth eagerly when the layer is built so the resulting service
    // surface (`Imap.connect`) doesn't leak `CredentialsService` /
    // `ImapCredentials` into the requirement channel. Layers are built once
    // per operation invocation, so this matches the credential lifetime
    // already established by `ImapCredentials.fromIntegration(...)`.
    const credentials = yield* ImapCredentials;
    const auth = yield* credentials.get();
    return {
      connect: () =>
        Effect.gen(function* () {
          const client = yield* Effect.acquireRelease(
            Effect.tryPromise({
              try: async () => {
                // Lazy import: keeps `imapflow` out of bundles that never
                // call `connect` (e.g. plain-browser sessions hitting the
                // credential form's unavailability branch).
                const { ImapFlow } = (await import('imapflow')) as { ImapFlow: any };
                const c = new ImapFlow({
                  host: auth.host,
                  port: auth.port,
                  secure: auth.secure,
                  auth: { user: auth.username, pass: readPassword(auth) },
                  logger: false,
                  emitLogs: false,
                });
                await c.connect();
                return c;
              },
              catch: mapError,
            }),
            (client) =>
              Effect.promise(async () => {
                try {
                  await client.logout();
                } catch (cause) {
                  log.warn('imapflow logout failed', { cause });
                  try {
                    await client.close();
                  } catch {}
                }
              }),
          );
          return makeConnection(client);
        }),
    };
  }),
);
