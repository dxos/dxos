//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import { Capability } from '@dxos/app-framework';
import { Operation, Trace } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { SyncBinding } from '@dxos/plugin-connector';
import { Tagging } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Jmap, JmapMail } from '../../../apis';
import { filterScopesMailbox, parseMailQuery, resolveMailboxByNameOrRole } from '../../../apis/jmap/util/query';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { InboxResolver, JmapCredentials } from '../../../services';
import { InboxCapabilities, InboxOperation, Mailbox } from '../../../types';
import { isAiServiceUnavailable } from '../../extractor';
import { mapEmail } from './mapper';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

// Page size per `Email/query`, and a cap on how far back a single sync scans. Re-syncs page newest
// first and dedup against the feed; the cap bounds subrequests. `SyncBinding.cursor` + JMAP
// `Email/changes` is the natural incremental-sync upgrade later; v1 uses date-window + dedup for
// parity with Gmail.
const PAGE_SIZE = 50;
const MAX_SCAN = 500;

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
          // The integration mechanism only ever binds Mailboxes for JMAP.
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
  // Erase the inferred handler type (which surfaces Connection from the input schema) so the default
  // export is portably nameable in the emitted .d.ts (TS2883).
  Operation.opaqueHandler,
);

const readBindingOptions = (binding: SyncBinding.SyncBinding) => {
  const raw = binding.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }
  return {
    syncBackDays: typeof raw.syncBackDays === 'number' ? raw.syncBackDays : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
  };
};

const syncMailbox = ({ binding, mailbox }: { binding: SyncBinding.SyncBinding; mailbox: Mailbox.Mailbox }) =>
  Effect.gen(function* () {
    const session = yield* Jmap.getSession;
    const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    if (!accountId) {
      log.warn('jmap session has no mail account', { username: session.username });
      return 0;
    }
    const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };
    log('jmap sync: session resolved', { apiUrl: session.apiUrl, accountId, username: session.username });

    const feed = yield* Database.load(mailbox.feed);
    // Resolve the child tag index so folder tags can be applied synchronously below.
    if (mailbox.tags) {
      yield* Database.load(mailbox.tags);
    }

    // Build a `folder id -> Tag uri` map (one Tag per JMAP folder, keyed by the folder id) and locate
    // the Inbox. Mirrors Gmail's `syncLabels`.
    const db = Obj.getDatabase(mailbox);
    const { list: folders } = yield* JmapMail.mailboxGet(target);
    const folderMap = new Map<string, string>();
    if (db) {
      for (const folder of folders) {
        const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
        folderMap.set(folder.id, Mailbox.tagUri(tag));
      }
    }
    const inbox = folders.find((folder) => folder.role === 'inbox');
    log('jmap sync: folders resolved', {
      folders: folders.length,
      inboxId: inbox?.id,
      roles: folders.map((folder) => folder.role),
    });

    // Foreign ids already present in the feed (dedup; mirrors Gmail's `existingGmailIds`).
    const objects = yield* Feed.runQuery(feed, Filter.type(Message.Message));
    const recent = objects.slice(-MAX_SCAN);
    const existingIds = new Set(
      recent.flatMap((message) =>
        Obj.getMeta(message)
          .keys.filter((key) => key.source === JMAP_MESSAGE_SOURCE)
          .map((key) => key.id),
      ),
    );

    // Translate the binding's Gmail-like `filter` option to a JMAP filter, resolving `label:`/`in:`
    // against this account's folders.
    const options = readBindingOptions(binding);
    const userFilter = options.filter
      ? parseMailQuery(options.filter, {
          now: new Date(),
          resolveMailbox: (nameOrRole) => resolveMailboxByNameOrRole(folders, nameOrRole),
        })
      : Option.none<Jmap.Filter>();
    // When the user filter already scopes a mailbox (e.g. `label:School`), don't also force the Inbox:
    // an email in `School` is rarely also in the Inbox, so AND-ing them would yield nothing.
    const scopesMailbox = Option.match(userFilter, { onNone: () => false, onSome: filterScopesMailbox });

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

    log('starting jmap sync', { username: session.username, existingIds: existingIds.size, filter });

    let position = 0;
    let total = 0;
    while (position < MAX_SCAN) {
      const { ids } = yield* JmapMail.emailQuery(target, {
        filter,
        sort: [{ property: 'receivedAt', isAscending: false }],
        position,
        limit: PAGE_SIZE,
      });
      log('jmap sync: queried page', { position, queried: ids.length });
      if (ids.length === 0) {
        break;
      }

      const newIds = ids.filter((id) => !existingIds.has(id));
      log('jmap sync: deduped page', { position, queried: ids.length, fresh: newIds.length });
      if (newIds.length > 0) {
        const { list: emails } = yield* JmapMail.emailGet(target, newIds);
        const mapped = (yield* Effect.forEach(emails, (email) => mapEmail(email))).filter(Predicate.isNotNullable);
        const messages = mapped.map((entry) => entry.message);
        // When `fetched > mapped`, emails were dropped by `mapEmail` (no sender or no extractable body).
        log('jmap sync: fetched + mapped', {
          requested: newIds.length,
          fetched: emails.length,
          mapped: messages.length,
        });
        if (messages.length > 0) {
          log('appending batch to feed', { count: messages.length });
          yield* Feed.append(feed, messages);

          // Apply folder tags: index each appended message under the Tag uri for every JMAP folder
          // it belongs to (`mailboxGet` created/updated those Tag objects above).
          for (const { message, mailboxIds } of mapped) {
            for (const folderId of mailboxIds) {
              const uri = folderMap.get(folderId);
              if (uri) {
                Tagging.set(message, uri, { index: mailbox.tags.target });
              }
            }
          }

          yield* runOnArrivalExtractors(mailbox, messages);
          total += messages.length;
          yield* Trace.emitStatus(`Syncing messages: ${total}`);
        }
      }

      position += ids.length;
      if (ids.length < PAGE_SIZE) {
        break;
      }
    }

    log('jmap sync complete', { newMessages: total });
    return total;
  });

// Runs auto-on-arrival extractors for just-synced messages (provider-agnostic; mirrors Gmail sync).
const runOnArrivalExtractors = (mailbox: Mailbox.Mailbox, messages: readonly Message.Message[]) =>
  Effect.gen(function* () {
    const extractorsConfig = mailbox.extractors;
    if (!extractorsConfig || extractorsConfig.enabled.length === 0) {
      return;
    }

    const extractors = yield* Capability.getAll(InboxCapabilities.ObjectExtractor);
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return;
    }

    for (const message of messages) {
      let best: { extractor: (typeof extractors)[number]; confidence: number } | undefined;
      for (const extractor of extractors) {
        if (!extractorsConfig.enabled.includes(extractor.id)) {
          continue;
        }
        let result;
        try {
          result = extractor.match(message);
        } catch (err) {
          log.warn('auto-on-arrival match failed', { err, extractorId: extractor.id, messageId: message.id });
          continue;
        }
        if (!result.matched) {
          continue;
        }
        const confidence = result.confidence ?? 0;
        if (confidence >= extractorsConfig.threshold && (!best || confidence > best.confidence)) {
          best = { extractor, confidence };
        }
      }
      if (best) {
        yield* Operation.invoke(
          InboxOperation.ExtractMessage,
          { db, source: message, extractorId: best.extractor.id },
          { spaceId: db.spaceId },
        ).pipe(
          Effect.catchAll((err) => {
            // The AI service can be momentarily absent from the process-manager LayerStack during
            // startup; treat that as a deferrable skip rather than a hard failure (see Gmail sync).
            if (isAiServiceUnavailable(err)) {
              log.info('auto-on-arrival extract skipped: AI service not ready', { messageId: message.id });
            } else {
              log.warn('auto-on-arrival extract failed', { err, messageId: message.id });
            }
            return Effect.void;
          }),
        );
      }
    }
  });
