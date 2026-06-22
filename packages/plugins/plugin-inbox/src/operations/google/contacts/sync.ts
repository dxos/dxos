//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MaterializeTarget, SyncBinding } from '@dxos/plugin-connector';
import { Person } from '@dxos/types';

import { GooglePeople } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { InboxOperation } from '../../../types';
import { mapGooglePerson } from './mapper';

/**
 * Fetch all members of a contact group by resource name.
 * Returns resource names like `people/c1234567890`.
 */
const fetchGroupMembers = Effect.fn(function* (groupResourceName: string) {
  const group = yield* GooglePeople.getContactGroup(groupResourceName, 1000);
  return group.memberResourceNames ?? [];
});

/**
 * Fetch all contacts via paginated `people.connections.list`.
 * Returns a Map keyed by resourceName for O(1) group-membership lookups.
 */
const fetchAllConnections = Effect.fn(function* () {
  const people: GooglePeople.Person[] = [];
  let pageToken: string | undefined;
  do {
    const response = yield* GooglePeople.listConnections({ pageToken });
    people.push(...(response.connections ?? []));
    pageToken = response.nextPageToken;
  } while (pageToken);
  return new Map(people.map((p) => [p.resourceName, p]));
});

/**
 * Find an existing Person keyed by Google resource name, or create a new one.
 * Returns `true` when a new Person was created.
 */
const upsertPerson = (remote: GooglePeople.Person) =>
  Effect.gen(function* () {
    const props = mapGooglePerson(remote);
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Person.Person, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remote.resourceName }])),
    ).run;

    if (existing.length > 0) {
      if (existing.length > 1) {
        log.warn('multiple Person records share the same Google resource name', {
          resourceName: remote.resourceName,
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

const syncOneGroup = (
  binding: SyncBinding.SyncBinding,
  groupResourceName: string,
  connectionsByResourceName: ReadonlyMap<string, GooglePeople.Person>,
) =>
  Effect.gen(function* () {
    log('syncing google contact group', { groupResourceName });

    const memberNames = yield* fetchGroupMembers(groupResourceName);
    if (memberNames.length === 0) {
      log('contact group is empty', { groupResourceName });
      return 0;
    }

    // Resolve members from the pre-fetched connections map.
    const people = memberNames
      .map((name) => connectionsByResourceName.get(name))
      .filter((person): person is GooglePeople.Person => person !== undefined);
    log('fetched group members', { groupResourceName, members: memberNames.length, matched: people.length });

    const upserted = yield* Stream.fromIterable(people).pipe(
      Stream.grouped(10),
      Stream.mapEffect((batch) =>
        Effect.gen(function* () {
          let count = 0;
          for (const person of Chunk.toArray(batch)) {
            if (yield* upsertPerson(person)) {
              count++;
            }
          }
          return count;
        }),
      ),
      Stream.runFold(0, (acc, batchCount) => acc + batchCount),
    );

    // Persist last sync timestamp on the binding.
    Relation.update(binding, (binding) => {
      const now = new Date().toISOString();
      binding.cursor = now;
      binding.lastSyncAt = now;
      binding.lastError = undefined;
    });

    log('contact group sync complete', { groupResourceName, upserted, total: people.length });
    return upserted;
  });

/**
 * Find an existing Collection materialized for this contact group, or create
 * one keyed by the group's foreign key. Idempotent within a space.
 */
const findOrCreateContactsCollection = (remoteId: string, name: string) =>
  Effect.gen(function* () {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Collection.Collection, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }])),
    ).run;
    if (existing.length > 0) {
      return existing[0];
    }
    const collection = Collection.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }] },
      name,
    });
    return yield* Database.add(collection);
  });

/**
 * Eagerly materializes a local Collection for a remote Google contact group so a
 * {@link SyncBinding} can be created. Contacts have no dedicated root type — the
 * Collection is the addressable local root for the group; synced `Person` objects
 * land directly in the space, keyed by foreign id.
 */
export const materializeTarget: MaterializeTarget = ({ remoteTarget, db }) =>
  Effect.gen(function* () {
    if (!remoteTarget) {
      // Contacts is a multi-target connector; a group selection is always present.
      return yield* findOrCreateContactsCollection('myContacts', 'Contacts');
    }
    return yield* findOrCreateContactsCollection(remoteTarget.id, remoteTarget.name);
  }).pipe(Effect.provide(Database.layer(db)));

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

        // Fetch all connections once and share across the upsert.
        const connectionsByResourceName = yield* fetchAllConnections();
        const total = yield* syncOneGroup(binding, groupResourceName, connectionsByResourceName);
        return { upserted: total };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromConnection(connectionRef)),
        ),
      );
    }),
  ),
);
