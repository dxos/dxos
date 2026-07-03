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
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { SyncBinding as ConnectorSyncBinding } from '@dxos/plugin-connector';
import { Cursor, Person } from '@dxos/types';

import { type DecodedEmail, decodeBody, mapToMessage } from './mapper';
import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { JmapCredentials } from '../../../services';
import { type Mapped, SyncBinding, extractContactsStage, htmlToMarkdownStage, makeDedupStage } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { onArrivalExtractorsStage, readBindingOptions } from '../../../util';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

// Number of email ids to query per page, emails fetched concurrently, and the commit page size.
const QUERY_PAGE_SIZE = 50;
const FETCH_CONCURRENCY = 5;
const COMMIT_PAGE_SIZE = 10;
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
          log.warn('jmap sync skipped: binding target is not a Mailbox', { typename: Obj.getTypename(mailbox) });
          return { newMessages: 0 };
        }

        const total = yield* syncMailbox({ binding, mailbox, db });

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

const syncMailbox = ({
  binding,
  mailbox,
  db,
}: {
  binding: ConnectorSyncBinding.SyncBinding;
  mailbox: Mailbox.Mailbox;
  db: Database.Database;
}) =>
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
    const tagIndex = yield* Database.load(mailbox.tags);

    // Build a folder-id → tag-uri map and locate the Inbox — mirrors Gmail's `syncLabels`.
    const { list: folders } = yield* JmapMail.mailboxGet(target);
    const folderTagMap = new Map<string, string>();
    for (const folder of folders) {
      const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
      folderTagMap.set(folder.id, Mailbox.tagUri(tag));
    }
    const inbox = folders.find((folder) => folder.role === 'inbox');
    log('jmap sync: folders resolved', { folders: folders.length, inboxId: inbox?.id });

    // The cursor is the high-water `receivedAt` (epoch-ms) of the last committed email.
    const cursorKey = Cursor.parseKey(binding.cursor);

    // Build the query filter: Inbox scope + date window (cursor or syncBackDays) + optional user DSL.
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
    if (cursorKey > 0) {
      conditions.push({ after: new Date(cursorKey).toISOString() });
    } else if (options.syncBackDays !== undefined) {
      conditions.push({ after: subDays(new Date(), options.syncBackDays).toISOString() });
    }
    if (Option.isSome(userFilter)) {
      conditions.push(userFilter.value);
    }
    const filter: Jmap.Filter | undefined =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : { operator: 'AND', conditions };

    log('starting jmap sync', { cursorKey, hasFilter: filter !== undefined, conditions: conditions.length });

    const stats: SyncBinding.Stats = { newMessages: 0 };

    const drain = jmapSource(target, filter).pipe(
      makeDedupStage<JmapMail.Email>(
        'dedup',
        (email) => email.id,
        (email) => new Date(email.receivedAt).getTime(),
      ),
      decodeBodyStage,
      htmlToMarkdownStage<DecodedEmail>(),
      makeMapToMessageStage(folderTagMap),
      onArrivalExtractorsStage<Mapped>(mailbox),
      extractContactsStage,
      Stream.grouped(COMMIT_PAGE_SIZE),
      Pipeline.run({ sink: SyncBinding.commit }),
    );

    yield* drain.pipe(
      Effect.provide(
        SyncBinding.layer({
          db,
          feed,
          tagIndex,
          foreignKeySource: JMAP_MESSAGE_SOURCE,
          cursorKey,
          persistCursorKey: (key) =>
            Relation.update(binding, (binding) => {
              binding.cursor = Cursor.formatKey(key);
            }),
          stats,
        }),
      ),
    );

    yield* Trace.emitStatus(`Synced ${stats.newMessages} messages`);
    log('jmap sync complete', { newMessages: stats.newMessages });
    return stats.newMessages;
  });

/** JMAP-specific decode stage: extract the body text; drop emails with no body. */
const decodeBodyStage: Stage.Stage<JmapMail.Email, DecodedEmail, never, never> = Stage.map(
  'decode-body',
  (email: JmapMail.Email) => Effect.sync(() => decodeBody(email) ?? undefined),
);

/** JMAP-specific mapping stage: resolve the sender contact (via `Resolver`), build the ECHO message,
 * and resolve folder ids to tag URIs (the folder map is JMAP-specific, closed over here). */
const makeMapToMessageStage = (folderTagMap: Map<string, string>): Stage.Stage<DecodedEmail, Mapped, never, Resolver> =>
  Stage.map('map-to-message', (decoded: DecodedEmail) =>
    Effect.gen(function* () {
      const fromAddress = decoded.raw.from?.[0];
      const contact = fromAddress ? yield* resolve(Person.Person, { email: fromAddress.email }) : undefined;
      const mapped = mapToMessage(decoded, contact ?? undefined);
      if (!mapped) {
        return undefined;
      }
      const tagUris = mapped.mailboxIds.flatMap((folderId) => {
        const uri = folderTagMap.get(folderId);
        return uri ? [uri] : [];
      });
      return {
        message: mapped.message,
        foreignId: decoded.raw.id,
        key: new Date(decoded.raw.receivedAt).getTime(),
        tagUris,
      };
    }),
  );

/** Streams JMAP emails: paginate ids (sorted newest-first) → concurrent per-email fetch. */
const jmapSource = (target: JmapMail.Target, filter: Jmap.Filter | undefined) =>
  Stream.paginateChunkEffect(0, (position: number) =>
    Effect.gen(function* () {
      const { ids } = yield* JmapMail.emailQuery(target, {
        filter,
        sort: [{ property: 'receivedAt', isAscending: false }],
        position,
        limit: QUERY_PAGE_SIZE,
      });
      log('jmap sync: queried page', { position, total: ids.length });
      const next = ids.length < QUERY_PAGE_SIZE ? Option.none<number>() : Option.some(position + ids.length);
      return [Chunk.fromIterable(ids), next];
    }),
  ).pipe(
    Stream.take(MAX_SCAN),
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
  );
