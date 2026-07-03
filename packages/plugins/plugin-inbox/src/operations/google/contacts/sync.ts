//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
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
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { Person } from '@dxos/types';

import { GooglePeople } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { GoogleCredentials } from '../../../services';
import { InboxOperation } from '../../../types';
import { mapGooglePerson } from './mapper';

/** A contact mapped to DXOS `Person` props, tagged with the Google resource name for upsert. */
type MappedPerson = { readonly resourceName: string; readonly props: ReturnType<typeof mapGooglePerson> };

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

/** Pipeline stage: map a Google contact to DXOS `Person` props (pure). */
const mapPersonStage: Stage.Stage<GooglePeople.Person, MappedPerson, never, never> = Stage.map(
  'map-person',
  (remote: GooglePeople.Person) => Effect.succeed({ resourceName: remote.resourceName, props: mapGooglePerson(remote) }),
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

    // Pipeline: contacts → map to Person props → upsert into the space. Unlike mail/calendar there
    // is no feed; the upsert sink is the terminal write, idempotent via the foreign-key lookup.
    const stats = { upserted: 0 };
    yield* Stream.fromIterable(people).pipe(
      mapPersonStage,
      Pipeline.run({
        sink: (mapped) =>
          Effect.gen(function* () {
            if (yield* upsertPerson(mapped)) {
              stats.upserted += 1;
            }
          }),
      }),
    );
    const upserted = stats.upserted;

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
