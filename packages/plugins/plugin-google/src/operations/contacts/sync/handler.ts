//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { type IdentityIndex, buildIdentityIndex } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Person } from '@dxos/types';

import { GoogleContacts } from '#apis';
import { GoogleCredentials } from '#services';
import { GoogleOperation } from '#types';

import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants.ts';
import { mapGooglePerson } from '../mapper.ts';

const COMMIT_PAGE_SIZE = 10;

/** A contact mapped to DXOS `Person` props, tagged with the Google resource name for upsert. */
type MappedPerson = { readonly resourceName: string; readonly props: ReturnType<typeof mapGooglePerson> };

/** The contact's last-modified time (max across sources) as an epoch-ms cursor key; 0 when absent. */
const updateTimeOf = (person: GoogleContacts.Person): number => {
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
  const group = yield* GoogleContacts.getContactGroup(groupResourceName, 1000);
  return group.memberResourceNames ?? [];
});

/** Streams all contacts via paginated `people.connections.list` (one page at a time). */
const connectionsSource = () =>
  // v4's `paginate` emits an array per step; its `Option.none` next-state is the terminator, so the
  // explicit `done` flag is gone.
  Stream.paginate(undefined as string | undefined, (pageToken: string | undefined) =>
    Effect.gen(function* () {
      const response = yield* GoogleContacts.listConnections({ pageToken });
      return [response.connections ?? [], Option.fromNullishOr(response.nextPageToken)] as const;
    }),
  );

/** Pipeline stage: map a Google contact to an upsert unit — Person props + the `updateTime` cursor key. */
const mapPersonStage: Stage.Stage<GoogleContacts.Person, Cursor.UpsertUnit<MappedPerson>, never, never> = Stage.map(
  'map-person',
  (remote: GoogleContacts.Person) =>
    Effect.succeed({
      item: { resourceName: remote.resourceName, props: mapGooglePerson(remote) },
      foreignId: remote.resourceName,
      key: updateTimeOf(remote),
    }),
);

/**
 * Commit sink: find the Person this contact already is and update it, or create a new one — the
 * single non-idempotent write, deferred out of the pure map stage. Returns `true` when a new Person
 * was created.
 *
 * Resolution is two-stage: the Google resource name (idempotent across runs), then the shared
 * identity resolver on each email. Without the second stage this sync could not see the Person mail
 * sync had already made for the same address, and minted a second one on every first contact sync.
 */
const upsertPerson =
  (index: IdentityIndex) =>
  ({ resourceName, props }: MappedPerson) =>
    Effect.gen(function* () {
      const keyed = yield* Database.query(
        Query.select(Filter.foreignKeys(Person.Person, [{ source: GOOGLE_INTEGRATION_SOURCE, id: resourceName }])),
      ).run;

      if (keyed.length > 1) {
        log.warn('multiple Person records share the same Google resource name', {
          resourceName,
          count: keyed.length,
        });
      }

      let person: Person.Person | undefined = keyed[0];
      if (!person) {
        for (const { value } of props.emails ?? []) {
          person = index.lookup(Person.Person, { email: value });
          if (person) {
            break;
          }
        }
      }

      if (!person) {
        const created = yield* Database.add(Person.make(props));
        // Index immediately so two group members sharing an address collapse within this run too.
        index.register(created);
        return true;
      }

      // Merge rather than assign: the remote contact is one source among several, and overwriting
      // would drop addresses and numbers learned from mail. `personIdentitySpec.merge` is the same
      // field policy the duplicates review uses.
      Obj.update(person, (person) => {
        InboxResolver.personIdentitySpec.merge(person, Person.make(props));
        if (!Obj.getKeys(person, GOOGLE_INTEGRATION_SOURCE).some((key) => key.id === resourceName)) {
          Obj.getMeta(person).keys.push({ source: GOOGLE_INTEGRATION_SOURCE, id: resourceName });
        }
      });

      return false;
    });

/** Syncs one bound contact group: stream connections → filter to group members → map → upsert. */
const syncContactGroup = (binding: Cursor.ExternalCursor) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(binding);
    const groupResourceName = binding.spec.externalId;
    if (!db || !groupResourceName) {
      // A misconfigured binding, not an empty group — visible in the log rather than a silent zero.
      log.warn('contact-group binding skipped', { binding: binding.id, hasDb: !!db, groupResourceName });
      return { upserted: 0 };
    }
    log('syncing google contact group', { groupResourceName });

    // The group membership is the set of resource names to keep; the source streams all
    // connections (paginated) and we filter to the group.
    const memberNames = new Set(yield* fetchGroupMembers(groupResourceName));
    const cursorKey = Cursor.parseKey(binding.max);

    // Pipeline: stream connections → filter to group members → map → upsert into the space. It's a
    // DB target (no feed); the upsert sink is idempotent via the foreign key and advances the
    // cursor (high-water contact `updateTime`) + run status in the same place as the write.
    //
    // NB: no dedup-by-cursor here — a contact added to the group without being modified has an
    // `updateTime` older than the cursor, so deduping would silently drop it. We re-upsert every
    // member each run (idempotent).
    // TODO(wittjosiah): Skip unchanged contacts (dedup by updateTime) once we also detect group
    //   membership changes, so newly-added-but-unmodified contacts still sync.
    // One query per identity type up front, then every lookup is O(1) and sees this run's writes.
    const index = yield* buildIdentityIndex(db, InboxResolver.identitySpecs);
    const stats: Cursor.Stats = { newMessages: 0 };
    yield* connectionsSource().pipe(
      Stage.filter('group-member', (person: GoogleContacts.Person) => memberNames.has(person.resourceName)),
      mapPersonStage,
      Stream.grouped(COMMIT_PAGE_SIZE),
      Pipeline.run({ sink: Cursor.upsertCommit(upsertPerson(index)) }),
      Effect.provide(
        Cursor.layer({ cursor: binding, foreignKeySource: GOOGLE_INTEGRATION_SOURCE, maxKey: cursorKey, stats }),
      ),
    );

    log('contact group sync complete', {
      groupResourceName,
      members: memberNames.size,
      upserted: stats.newMessages,
    });
    return { upserted: stats.newMessages };
  });

const handler = GoogleOperation.GoogleContactsSync.pipe(
  Operation.withHandler(({ connection, priority }) =>
    Binding.syncAll({
      connection,
      priority,
      sync: (binding) =>
        syncContactGroup(binding).pipe(
          Effect.provide(
            Layer.mergeAll(
              FetchHttpClient.layer,
              InboxResolver.Live,
              GoogleCredentials.fromAccessToken(binding.spec.source),
            ),
          ),
        ),
    }).pipe(
      Effect.map(({ outputs }) => ({
        upserted: outputs.reduce((total, output) => total + output.upserted, 0),
      })),
    ),
  ),
  Operation.opaqueHandler,
);

export default handler;
