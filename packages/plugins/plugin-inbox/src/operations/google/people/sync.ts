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
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';
import { Person } from '@dxos/types';

import { GooglePeople } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { GoogleContactsSync } from '../../definitions';
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
 */
const fetchAllConnections = Effect.fn(function* () {
  const people: GooglePeople.Person[] = [];
  let pageToken: string | undefined;
  do {
    const response = yield* GooglePeople.listConnections({ pageToken });
    people.push(...(response.connections ?? []));
    pageToken = response.nextPageToken;
  } while (pageToken);
  return people;
});

/**
 * Find an existing Person keyed by Google resource name, or create a new one.
 */
const upsertPerson = (remote: GooglePeople.Person) =>
  Effect.gen(function* () {
    const props = mapGooglePerson(remote);
    const existing = yield* Database.runQuery(
      Query.select(Filter.foreignKeys(Person.Person, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remote.resourceName }])),
    );

    if (existing.length > 0) {
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

const syncOneGroup = (integration: Integration.Integration, groupResourceName: string) =>
  Effect.gen(function* () {
    log('syncing google contact group', { groupResourceName });

    // Fetch group membership and all connections in parallel.
    const [memberNames, allConnections] = yield* Effect.all([
      fetchGroupMembers(groupResourceName),
      fetchAllConnections(),
    ]);

    if (memberNames.length === 0) {
      log('contact group is empty', { groupResourceName });
      return 0;
    }

    // Filter to only contacts that are members of this group.
    const memberSet = new Set(memberNames);
    const people = allConnections.filter((p) => memberSet.has(p.resourceName));
    log('fetched group members', { groupResourceName, members: memberNames.length, matched: people.length });

    let upserted = 0;
    yield* Stream.fromIterable(people).pipe(
      Stream.grouped(10),
      Stream.mapEffect((batch) =>
        Effect.gen(function* () {
          for (const person of Chunk.toArray(batch)) {
            const created = yield* upsertPerson(person);
            if (created) {
              upserted++;
            }
          }
        }),
      ),
      Stream.runDrain,
    );

    // Persist last sync timestamp on the integration target.
    const targetIdx = integration.targets?.findIndex((t) => t.remoteId === groupResourceName) ?? -1;
    if (targetIdx >= 0) {
      Obj.update(integration, (integration) => {
        const now = new Date().toISOString();
        integration.targets[targetIdx] = { ...integration.targets[targetIdx], cursor: now, lastSyncAt: now };
      });
    }

    log('contact group sync complete', { groupResourceName, upserted, total: people.length });
    return upserted;
  });

export default GoogleContactsSync.pipe(
  Operation.withHandler(({ integration: integrationRef, contactGroupResourceName }) =>
    Effect.gen(function* () {
      const integrationObj = yield* Database.load(integrationRef);

      const targetGroups: string[] = [];
      if (contactGroupResourceName) {
        targetGroups.push(contactGroupResourceName);
      } else {
        for (const target of integrationObj.targets ?? []) {
          if (target.remoteId) {
            targetGroups.push(target.remoteId);
          }
        }
      }

      let total = 0;
      for (const groupId of targetGroups) {
        total += yield* syncOneGroup(integrationObj, groupId);
      }

      return { upserted: total };
    }).pipe(
      Effect.provide(
        Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromIntegration(integrationRef)),
      ),
    ),
  ),
);
