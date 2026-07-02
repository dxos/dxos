//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { subDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { Operation, Trace } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { SyncBinding } from '@dxos/plugin-connector';
import { Message } from '@dxos/types';

import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { InboxResolver, JmapCredentials } from '../../../services';
import { InboxOperation, Mailbox } from '../../../types';
import { appendBatchToFeed, collectForeignIds, readBindingOptions } from '../../../util';
import { mapEmail } from './mapper';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

// Number of email ids to query per page and fetch concurrently — mirrors Gmail's STREAMING_CONFIG.
const PAGE_SIZE = 50;
const FETCH_CONCURRENCY = 5;
const BATCH_SIZE = 10;

export default InboxOperation.JmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db) {
        log.warn('jmap sync skipped: missing binding target or database', {
          hasBinding: Boolean(bindingObj),
          hasDatabase: Boolean(db),
        });
        return { newMessages: 0 };
      }

      const connectionRef = Ref.make(Relation.getSource(bindingObj));

      return yield* Effect.gen(function* () {
        const binding = yield* Database.load(bindingRef);
        const mailbox = Relation.getTarget(binding);
        if (!Mailbox.instanceOf(mailbox)) {
          log.warn('jmap sync skipped: binding target is not a Mailbox', { typename: Obj.getTypename(mailbox) });
          return { newMessages: 0 };
        }

        const total = yield* syncMailbox({ binding, mailbox });

        Relation.update(binding, (binding) => {
          binding.lastSyncAt = new Date().toISOString();
          binding.lastError = undefined;
        });

        return { newMessages: total };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, JmapCredentials.fromConnection(connectionRef)),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

const syncMailbox = ({ binding, mailbox }: { binding: SyncBinding.SyncBinding; mailbox: Mailbox.Mailbox }) =>
  Effect.gen(function* () {
    const session = yield* Jmap.getSession;
    const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    if (!accountId) {
      log.warn('jmap sync: session has no mail account', { username: session.username });
      return 0;
    }
    const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };
    log('jmap sync: session resolved', { apiUrl: session.apiUrl, accountId });

    const feed = yield* Database.load(mailbox.feed);
    if (mailbox.tags) {
      yield* Database.load(mailbox.tags);
    }

    // Build a folder-id → tag-uri map and locate the Inbox — mirrors Gmail's `syncLabels`.
    const db = Obj.getDatabase(mailbox);
    const { list: folders } = yield* JmapMail.mailboxGet(target);
    const folderTagMap = new Map<string, string>();
    if (db) {
      for (const folder of folders) {
        const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
        folderTagMap.set(folder.id, Mailbox.tagUri(tag));
      }
    }
    const inbox = folders.find((folder) => folder.role === 'inbox');
    log('jmap sync: folders resolved', { folders: folders.length, inboxId: inbox?.id });

    // JMAP sync drains the provider query, so dedup against all known JMAP ids to keep retries idempotent.
    const objects = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const existingIds = collectForeignIds(objects, JMAP_MESSAGE_SOURCE, objects.length);

    // Build the query filter: Inbox scope + optional date window + optional Gmail-like query DSL.
    const options = readBindingOptions(binding);
    const userFilter = options.filter
      ? JmapMail.parseMailQuery(options.filter, {
          now: new Date(),
          resolveMailbox: (nameOrRole) => JmapMail.resolveMailboxByNameOrRole(folders, nameOrRole),
        })
      : Option.none<Jmap.Filter>();
    // When the user filter already scopes a mailbox, skip the forced Inbox restriction.
    const scopesMailbox = Option.match(userFilter, { onNone: () => false, onSome: JmapMail.filterScopesMailbox });

    const conditions: Jmap.Filter[] = [];
    if (inbox && !scopesMailbox) {
      conditions.push({ inMailbox: inbox.id });
    }
    if (options.syncBackDays !== undefined) {
      conditions.push({ after: subDays(new Date(), options.syncBackDays).toISOString() });
    }
    if (Option.isSome(userFilter)) {
      conditions.push(userFilter.value);
    }
    const filter: Jmap.Filter | undefined =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : { operator: 'AND', conditions };

    // Log only non-PII context: counts and a sanitized filter shape (not the raw user query string).
    log('starting jmap sync', {
      existingIds: existingIds.size,
      hasFilter: filter !== undefined,
      conditions: conditions.length,
    });

    // Stream pages of ids → concurrent email fetch → map → batch append.
    // Mirrors Gmail's streamGmailMessagesToFeed structure: Stream.flatMap with concurrency
    // decouples id-fetching from email-fetching so both pipeline stages run in parallel.
    const count = yield* streamJmapEmailIds(target, filter).pipe(
      Stream.filter((id) => !existingIds.has(id)),
      // Fetch each email concurrently — same concurrency as Gmail's messageFetchConcurrency.
      Stream.flatMap(
        (id) =>
          Stream.fromEffect(
            JmapMail.emailGet(target, [id]).pipe(
              Effect.map(({ list }) => list[0]),
              Effect.filterOrFail(Predicate.isNotNullable, () => new Error(`email ${id} not found`)),
            ),
          ).pipe(Stream.orElse(() => Stream.empty)),
        { concurrency: FETCH_CONCURRENCY, bufferSize: 10 },
      ),
      Stream.mapEffect((email) => mapEmail(email)),
      Stream.filter(Predicate.isNotNullable),
      Stream.grouped(BATCH_SIZE),
      Stream.mapEffect((batch) =>
        Effect.gen(function* () {
          const mapped = Chunk.toArray(batch);
          const messages = mapped.map((m) => m.message);
          log('jmap sync: appending batch', { count: messages.length });
          yield* appendBatchToFeed(feed, mailbox, messages, (message) => {
            const entry = mapped.find((m) => m.message === message);
            return (
              entry?.mailboxIds.flatMap((folderId) => {
                const uri = folderTagMap.get(folderId);
                return uri ? [uri] : [];
              }) ?? []
            );
          });
          return messages.length;
        }),
      ),
      Stream.runFoldEffect(
        0,
        Effect.fnUntraced(function* (acc, n) {
          yield* Trace.emitStatus(`Syncing messages: ${acc + n}`);
          return acc + n;
        }),
      ),
    );

    log('jmap sync complete', { newMessages: count });
    return count;
  });

/** Paginates JMAP email ids via `Email/query` until the query is exhausted. */
export const streamJmapEmailIds = (target: JmapMail.Target, filter: Jmap.Filter | undefined) =>
  Stream.paginateChunkEffect(0, (position) =>
    Effect.gen(function* () {
      const { ids, total } = yield* JmapMail.emailQuery(target, {
        filter,
        sort: [{ property: 'receivedAt', isAscending: false }],
        position,
        limit: PAGE_SIZE,
        calculateTotal: true,
      });
      log('jmap sync: queried page', { position, count: ids.length, total });
      const isExhausted = total !== undefined ? position + ids.length >= total : ids.length < PAGE_SIZE;
      const next = isExhausted ? Option.none<number>() : Option.some(position + ids.length);
      return [Chunk.fromIterable(ids), next];
    }),
  );
