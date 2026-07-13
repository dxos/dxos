//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleContactsSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, Cursor, Person, SyncBinding } from '@dxos/types';

import { GooglePeople } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { GoogleCredentials } from '../../../services';
import { InboxOperation } from '../../../types';
import { mapGooglePerson } from './mapper';

const COMMIT_PAGE_SIZE = 10;

/** A contact mapped to DXOS `Person` props, tagged with the Google resource name for upsert. */
type MappedPerson = { readonly resourceName: string; readonly props: ReturnType<typeof mapGooglePerson> };

/** The contact's last-modified time (max across sources) as an epoch-ms cursor key; 0 when absent. */
const updateTimeOf = (person: GooglePeople.Person): number => {
  const times = (person.metadata?.sources ?? []).map((source) =>
    source.updateTime ? Date.parse(source.updateTime) : 0,
  );
  return times.length > 0 ? Math.max(...times) : 0;
};

/**
 * Fetch all members of a contact group by resource name.
 * Returns resource names like `people/c1234567890`.
 */
const fetchGroupMembers = Effect.fn(function* (groupResourceName: string) {
  const group = yield* GooglePeople.getContactGroup(groupResourceName, 1000);
  return group.memberResourceNames ?? [];
});

/** Streams all contacts via paginated `people.connections.list` (one page at a time). */
const connectionsSource = () =>
  Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }
      const response = yield* GooglePeople.listConnections({ pageToken: Option.getOrUndefined(state.pageToken) });
      return Option.some([
        Chunk.fromIterable(response.connections ?? []),
        { pageToken: Option.fromNullable(response.nextPageToken), done: !response.nextPageToken },
      ] as const);
    }),
  );

/** Pipeline stage: map a Google contact to an upsert unit — Person props + the `updateTime` cursor key. */
const mapPersonStage: Stage.Stage<GooglePeople.Person, SyncBinding.UpsertUnit<MappedPerson>, never, never> = Stage.map(
  'map-person',
  (remote: GooglePeople.Person) =>
    Effect.succeed({
      item: { resourceName: remote.resourceName, props: mapGooglePerson(remote) },
      foreignId: remote.resourceName,
      key: updateTimeOf(remote),
    }),
);

/**
 * Commit sink: find an existing Person keyed by Google resource name and update it, or create a new
 * one — the single non-idempotent write, deferred out of the pure map stage. Idempotent across runs
 * via the foreign-key lookup. Returns `true` when a new Person was created.
 */
const upsertPerson = ({ resourceName, props }: MappedPerson) =>
  Effect.gen(function* () {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Person.Person, [{ source: GOOGLE_INTEGRATION_SOURCE, id: resourceName }])),
    ).run;

    if (existing.length > 0) {
      if (existing.length > 1) {
        log.warn('multiple Person records share the same Google resource name', {
          resourceName,
          count: existing.length,
        });
      }
      const person = existing[0] as Person.Person;
      Obj.update(person, (person) => {
        if (props.fullName !== undefined) {
          person.fullName = props.fullName;
        }
        if (props.jobTitle !== undefined) {
          person.jobTitle = props.jobTitle;
        }
        if (props.department !== undefined) {
          person.department = props.department;
        }
        if (props.notes !== undefined) {
          person.notes = props.notes;
        }
        if (props.image !== undefined) {
          person.image = props.image;
        }
        if (props.birthday !== undefined) {
          person.birthday = props.birthday;
        }
        person.emails = props.emails ? [...props.emails] : [];
        person.phoneNumbers = props.phoneNumbers ? [...props.phoneNumbers] : [];
        person.addresses = props.addresses ? [...props.addresses] : [];
        person.urls = props.urls ? [...props.urls] : [];
      });
      return false;
    }

    yield* Database.add(Person.make(props));
    return true;
  });

export default InboxOperation.GoogleContactsSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db) {
        return { upserted: 0 };
      }

      const connectionRef = Ref.make(Relation.getSource(bindingObj));

      return yield* Effect.gen(function* () {
        const binding = yield* Database.load(bindingRef);
        const groupResourceName = binding.remoteId;
        if (!groupResourceName) {
          return { upserted: 0 };
        }
        log('syncing google contact group', { groupResourceName });

        // The group membership is the set of resource names to keep; the source streams all
        // connections (paginated) and we filter to the group.
        const memberNames = new Set(yield* fetchGroupMembers(groupResourceName));
        const cursor = yield* Database.load(binding.cursor);
        const cursorKey = Cursor.parseKey(cursor.value);

        // Pipeline: stream connections → filter to group members → map → upsert into the space. It's a
        // DB target (no feed); the upsert sink is idempotent via the foreign key and advances the
        // cursor (high-water contact `updateTime`) + run status in the same place as the write.
        //
        // NB: no dedup-by-cursor here — a contact added to the group without being modified has an
        // `updateTime` older than the cursor, so deduping would silently drop it. We re-upsert every
        // member each run (idempotent).
        // TODO(wittjosiah): Skip unchanged contacts (dedup by updateTime) once we also detect group
        //   membership changes, so newly-added-but-unmodified contacts still sync.
        const stats: SyncBinding.Stats = { newMessages: 0 };
        yield* connectionsSource().pipe(
          Stage.filter('group-member', (person: GooglePeople.Person) => memberNames.has(person.resourceName)),
          mapPersonStage,
          Stream.grouped(COMMIT_PAGE_SIZE),
          Pipeline.run({ sink: SyncBinding.upsertCommit(upsertPerson) }),
          Effect.provide(SyncBinding.layer({ binding, foreignKeySource: GOOGLE_INTEGRATION_SOURCE, cursorKey, stats })),
        );

        log('contact group sync complete', {
          groupResourceName,
          members: memberNames.size,
          upserted: stats.newMessages,
        });
        return { upserted: stats.newMessages };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromConnection(connectionRef)),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);
