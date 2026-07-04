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

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { Cursor, Person } from '@dxos/types';

import { type DecodedEmail, decodeBody, mapToMessage } from './mapper';
import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { JmapCredentials } from '../../../services';
import { EmailStage } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { readBindingOptions } from '../../../util';

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

        const session = yield* Jmap.getSession;
        const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
        if (!accountId) {
          log.warn('jmap sync: session has no mail account', { username: session.username });
          return { newMessages: 0 };
        }
        const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };
        log('jmap sync: session resolved', { apiUrl: session.apiUrl, accountId });

        const { db } = yield* Database.Service;
        const feed = yield* Database.load(mailbox.feed);
        const tagIndex = yield* Database.load(mailbox.tags);

        // TODO(wittjosiah): Migrate this folder→Tag sync onto a pipeline too (source: folders; sink:
        //   find-or-create Tag), rather than the imperative loop below.
        // Build a folder-id → tag-uri map — mirrors Gmail's `syncLabels`.
        const { list: folders } = yield* JmapMail.mailboxGet(target);
        const folderTagMap = new Map<string, string>();
        for (const folder of folders) {
          const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
          folderTagMap.set(folder.id, Mailbox.tagUri(tag));
        }

        // The cursor is the high-water `receivedAt` (epoch-ms) of the last committed email.
        const cursor = yield* Database.load(binding.cursor);
        const cursorKey = Cursor.parseKey(cursor.value);

        // Resolve the sender contact, build the ECHO message, and resolve folder ids to tag URIs via
        // the (JMAP-specific) folder map captured here.
        const mapToMessageStage: Stage.Stage<DecodedEmail, EmailStage.Mapped, never, Resolver> = Stage.map(
          'map-to-message',
          (decoded: DecodedEmail) =>
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

        const stats: SyncBinding.Stats = { newMessages: 0 };
        yield* jmapSource(target, folders, cursorKey, readBindingOptions(binding)).pipe(
          SyncBinding.dedupStage<JmapMail.Email>(
            'dedup',
            (email) => email.id,
            (email) => new Date(email.receivedAt).getTime(),
          ),
          decodeBodyStage,
          EmailStage.htmlToMarkdown,
          mapToMessageStage,
          EmailStage.onArrivalExtractors(mailbox),
          EmailStage.extractContacts,
          Stream.grouped(COMMIT_PAGE_SIZE),
          Pipeline.run({ sink: SyncBinding.commit }),
          Effect.provide(
            SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: JMAP_MESSAGE_SOURCE, cursorKey, stats }),
          ),
        );

        log('jmap sync complete', { newMessages: stats.newMessages });
        return { newMessages: stats.newMessages };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, JmapCredentials.fromConnection(connectionRef)),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

/** JMAP-specific decode stage: extract the body text; drop emails with no body. */
const decodeBodyStage: Stage.Stage<JmapMail.Email, DecodedEmail, never, never> = Stage.map(
  'decode-body',
  (email: JmapMail.Email) => Effect.sync(() => decodeBody(email) ?? undefined),
);

/**
 * Streams JMAP emails from the cursor: build the query filter (Inbox scope + date window from the
 * cursor or `syncBackDays` + optional user DSL), paginate ids (newest-first), then fetch each email.
 */
const jmapSource = (
  target: JmapMail.Target,
  folders: readonly JmapMail.Mailbox[],
  cursorKey: number,
  options: { syncBackDays?: number; filter?: string },
) => {
  const userFilter = options.filter
    ? JmapMail.parseMailQuery(options.filter, {
        now: new Date(),
        resolveMailbox: (nameOrRole) => JmapMail.resolveMailboxByNameOrRole(folders, nameOrRole),
      })
    : Option.none<Jmap.Filter>();
  // When the user filter already scopes a mailbox, skip the forced Inbox restriction.
  const scopesMailbox = Option.match(userFilter, { onNone: () => false, onSome: JmapMail.filterScopesMailbox });
  const inbox = folders.find((folder) => folder.role === 'inbox');

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

  return Stream.paginateChunkEffect(0, (position: number) =>
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
};
