//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Imap, ImapError, readImapPassword } from '@dxos/functions';
import type { ImapAuthValues, ImapBody, ImapConnection, ImapEnvelope } from '@dxos/functions';

import { ImapClient, type RawEnvelope } from './internal/imap-client';

const errorOf =
  (reason: 'auth' | 'connect' | 'tls' | 'protocol' | 'timeout' | 'unavailable' | 'unknown') =>
  (error: unknown): ImapError =>
    new ImapError({ reason, message: error instanceof Error ? error.message : String(error) });

const mapEnvelope = (raw: RawEnvelope): ImapEnvelope => ({
  uid: raw.uid,
  internalDate: raw.internalDate ? new Date(raw.internalDate) : new Date(0),
  size: raw.size ?? 0,
  ...(raw.subject !== undefined ? { subject: raw.subject } : {}),
  from: parseAddressList(raw.from),
  to: parseAddressList(raw.to),
  ...(raw.messageId !== undefined ? { messageId: raw.messageId } : {}),
  flags: raw.flags,
});

const parseAddressList = (value: string | undefined): { name?: string; address: string }[] => {
  if (!value) {
    return [];
  }
  return value.split(',').flatMap((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return [];
    }
    const angle = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
    if (angle) {
      const name = angle[1].replace(/^"|"$/g, '').trim();
      return [{ ...(name ? { name } : {}), address: angle[2] }];
    }
    return [{ address: trimmed }];
  });
};

/**
 * Workers-side IMAP `Imap` Live layer. Opens a fresh authenticated session per
 * `connect(auth)` call; LOGOUT fires on scope exit. Concrete service that can be
 * dropped into a managed runtime context — function-bundle entry points wire this
 * via `Layer.provideMerge(ImapLive)`.
 */
export const ImapLive: Layer.Layer<Imap> = Layer.succeed(Imap, {
  connect: (auth: ImapAuthValues) =>
    Effect.acquireRelease(
      Effect.gen(function* () {
        const client = new ImapClient({
          host: auth.host,
          port: auth.port,
          auth: {
            username: auth.username,
            password: readImapPassword(auth),
          },
        });
        yield* Effect.tryPromise({
          try: () => client.connect(),
          catch: errorOf('connect'),
        });
        yield* Effect.tryPromise({
          try: () => client.login(),
          catch: errorOf('auth'),
        });
        return wrapConnection(client);
      }),
      ({ _client }) =>
        Effect.tryPromise({
          try: () => _client.logout(),
          catch: () => undefined,
        }).pipe(Effect.ignore),
    ),
});

type WrappedConnection = ImapConnection & { _client: ImapClient };

const wrapConnection = (client: ImapClient): WrappedConnection => ({
  _client: client,
  select: (folder) =>
    Effect.tryPromise({
      try: () => client.select(folder),
      catch: errorOf('protocol'),
    }).pipe(
      Effect.map((state) => ({
        name: folder,
        uidValidity: state.uidValidity,
        uidNext: state.uidNext,
        exists: state.exists,
      })),
    ),
  searchUidsSince: (since) =>
    Effect.tryPromise({
      try: () => client.uidSearchSince(since),
      catch: errorOf('protocol'),
    }),
  searchUidsAbove: (uid) =>
    Effect.tryPromise({
      try: () => client.uidFetchSince(uid).then((envs) => envs.map((e) => e.uid)),
      catch: errorOf('protocol'),
    }),
  fetchEnvelopes: (uids) =>
    Effect.gen(function* () {
      if (uids.length === 0) {
        return [];
      }
      const range = uids.join(',');
      const raws = yield* Effect.tryPromise({
        try: () => client.uidFetchRange(range),
        catch: errorOf('protocol'),
      });
      return raws.map(mapEnvelope);
    }),
  fetchBody: () =>
    Effect.fail(
      new ImapError({
        reason: 'unknown',
        message: 'fetchBody not yet implemented; use postal-mime + BODY[] when wired.',
      }),
    ) as Effect.Effect<ImapBody, ImapError>,
});
