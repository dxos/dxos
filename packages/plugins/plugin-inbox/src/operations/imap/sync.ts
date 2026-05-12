//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential, Trace } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';
import { Message } from '@dxos/types';

import { ImapLive } from '../../apis';
import { Imap, ImapCredentials, InboxResolver } from '../../services';
import { Mailbox, type ImapAccountOptions } from '../../types';
import { ImapSync } from '../definitions';
import { mapMessage } from './mapper';

const DEFAULT_FOLDER = 'INBOX';
const DEFAULT_SYNC_BACK_DAYS = 30;
/** Cap fetched envelopes per run to keep Workers within CPU budget. */
const MAX_UIDS_PER_RUN = 200;

type CursorParts = { uidValidity: number; uid: number };

/** Encode/decode the cursor as `<uidValidity>:<uid>` (matches the foreign-id format). */
const parseCursor = (cursor: string | undefined): CursorParts | undefined => {
  if (!cursor) {
    return undefined;
  }
  const [uidValidityRaw, uidRaw] = cursor.split(':');
  const uidValidity = Number(uidValidityRaw);
  const uid = Number(uidRaw);
  if (!Number.isFinite(uidValidity) || !Number.isFinite(uid)) {
    return undefined;
  }
  return { uidValidity, uid };
};

const formatCursor = (uidValidity: number, uid: number): string => `${uidValidity}:${uid}`;

const readTargetOptions = (
  integration: Integration.Integration,
  mailbox: Mailbox.Mailbox,
): { options: Partial<ImapAccountOptions>; targetIndex: number } => {
  const targetIndex = (integration.targets ?? []).findIndex(
    (target) => target.object?.dxn?.asEchoDXN()?.echoId === mailbox.id,
  );
  if (targetIndex < 0) {
    return { options: {}, targetIndex: -1 };
  }
  const raw = integration.targets[targetIndex].options;
  return { options: (raw ?? {}) as Partial<ImapAccountOptions>, targetIndex };
};

export default ImapSync.pipe(
  Operation.withHandler(({ integration: integrationRef, mailbox: mailboxRefOptional }) =>
    Effect.gen(function* () {
      const integration = yield* Database.load(integrationRef);

      // Resolve target mailbox(es): explicit ref wins, otherwise sync every
      // mailbox listed on the Integration (single-mailbox-per-integration
      // is the common case for IMAP, but support multiple for parity).
      const mailboxRefs: Array<Ref.Ref<Mailbox.Mailbox>> = [];
      if (mailboxRefOptional) {
        mailboxRefs.push(mailboxRefOptional);
      } else {
        for (const target of integration.targets ?? []) {
          if (!target.object) {
            continue;
          }
          const loaded = yield* Database.load(target.object as Ref.Ref<Mailbox.Mailbox>).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          if (loaded && Mailbox.instanceOf(loaded)) {
            mailboxRefs.push(Ref.make(loaded));
          }
        }
      }

      let total = 0;
      for (const mailboxRef of mailboxRefs) {
        total += yield* syncOneMailbox(integration, mailboxRef);
      }
      return { newMessages: total };
    }).pipe(
      Effect.scoped,
      Effect.provide(
        Layer.mergeAll(
          InboxResolver.Live,
          Layer.provide(ImapLive, ImapCredentials.fromIntegration(integrationRef)),
        ),
      ),
    ),
  ),
);

const syncOneMailbox = (integration: Integration.Integration, mailboxRef: Ref.Ref<Mailbox.Mailbox>) =>
  Effect.gen(function* () {
    const mailbox = yield* Database.load(mailboxRef);
    const { options, targetIndex } = readTargetOptions(integration, mailbox);
    const folder = options.folder ?? DEFAULT_FOLDER;
    const filter = options.filter;
    const syncBackDays = options.syncBackDays ?? DEFAULT_SYNC_BACK_DAYS;

    log('imap sync starting', { mailbox: mailboxRef.dxn.toString(), folder, syncBackDays });

    const conn = yield* Imap.connect();
    const box = yield* conn.select(folder, 'read');
    const previousCursor = parseCursor(integration.targets[targetIndex]?.cursor);

    // UIDVALIDITY mismatch invalidates the cursor; fall back to date-based
    // search so the next run rebuilds from scratch (dedupe via foreign keys
    // still suppresses re-imports for unchanged messages).
    const useIncremental = previousCursor && previousCursor.uidValidity === box.uidValidity;
    const since = subDays(new Date(), syncBackDays);

    const allUids = useIncremental
      ? yield* conn.searchUidsAbove(previousCursor!.uid)
      : yield* conn.searchUidsSince(since, filter);

    if (allUids.length === 0) {
      log('imap sync: no new uids', { folder, useIncremental });
      yield* updateTargetMetadata(integration, targetIndex, box.uidValidity, previousCursor?.uid ?? 0);
      return 0;
    }

    // Cap to MAX_UIDS_PER_RUN — sort ascending so we always advance forward.
    const sortedUids = [...allUids].sort((a, b) => a - b);
    const uidsToFetch = sortedUids.slice(0, MAX_UIDS_PER_RUN);
    log('imap sync: fetching envelopes', { count: uidsToFetch.length });

    const envelopes = yield* conn.fetchEnvelopes(uidsToFetch);

    const accessToken = yield* Database.load(integration.accessToken);
    const host = (accessToken.source ?? '').startsWith('imap:')
      ? (accessToken.source as string).slice('imap:'.length)
      : (options.host ?? accessToken.source ?? 'imap');

    const feed = yield* Database.load(mailbox.feed);
    const existing = yield* Feed.runQuery(feed, Filter.type(Message.Message));
    const foreignSource = `imap:${host}`;
    const existingForeignIds = new Set(
      existing.flatMap((msg) =>
        Obj.getMeta(msg).keys.filter((key) => key.source === foreignSource).map((key) => key.id),
      ),
    );

    let appended = 0;
    let highestUid = previousCursor?.uid ?? 0;
    for (const envelope of envelopes) {
      const foreignId = `${box.uidValidity}:${envelope.uid}`;
      if (existingForeignIds.has(foreignId)) {
        log('imap sync: skipping duplicate', { foreignId });
        highestUid = Math.max(highestUid, envelope.uid);
        continue;
      }
      const body = yield* conn.fetchBody(envelope.uid);
      const message = yield* mapMessage({ envelope, body, host, uidValidity: box.uidValidity });
      if (!message) {
        continue;
      }
      yield* Feed.append(feed, [message]);
      existingForeignIds.add(foreignId);
      appended++;
      highestUid = Math.max(highestUid, envelope.uid);
    }

    yield* updateTargetMetadata(integration, targetIndex, box.uidValidity, highestUid);
    log('imap sync done', { appended, highestUid });
    return appended;
  });

const updateTargetMetadata = (
  integration: Integration.Integration,
  targetIndex: number,
  uidValidity: number,
  uid: number,
) =>
  Effect.sync(() => {
    if (targetIndex < 0) {
      return;
    }
    const cursor = formatCursor(uidValidity, uid);
    Obj.update(integration, (mutable) => {
      const next = [...mutable.targets];
      next[targetIndex] = {
        ...next[targetIndex],
        cursor,
        lastSyncAt: new Date().toISOString(),
      };
      (mutable as Obj.Mutable<typeof mutable>).targets = next;
    });
  });
