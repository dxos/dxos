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

const BATCH_SIZE = 200;

/**
 * Fetch all members of a contact group by resource name.
 * Groups can have up to 1000 members in a single GET; for larger groups
 * subsequent requests would be needed but 1000 is the API maximum per call.
 */
const fetchGroupMembers = Effect.fn(function* (groupResourceName: string) {
  const group = yield* GooglePeople.getContactGroup(groupResourceName, 1000);
  return group.memberResourceNames ?? [];
});

/**
 * Fetch people for a list of resource names in batches of `BATCH_SIZE`.
 */
const fetchPeopleInBatches = Effect.fn(function* (resourceNames: readonly string[]) {
  const people: GooglePeople.Person[] = [];
  for (let i = 0; i < resourceNames.length; i += BATCH_SIZE) {
    const batch = resourceNames.slice(i, i + BATCH_SIZE);
    const response = yield* GooglePeople.batchGetPeople(batch);
    for (const item of response.responses ?? []) {
      if (item.person) {
        people.push(item.person);
      }
    }
  }
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
        const mutable = person as Obj.Mutable<typeof person>;
        if (props.fullName !== undefined) { mutable.fullName = props.fullName; }
        if (props.jobTitle !== undefined) { mutable.jobTitle = props.jobTitle; }
        if (props.department !== undefined) { mutable.department = props.department; }
        if (props.notes !== undefined) { mutable.notes = props.notes; }
        if (props.image !== undefined) { mutable.image = props.image; }
        if (props.birthday !== undefined) { mutable.birthday = props.birthday; }
        if (props.emails) { mutable.emails = [...props.emails]; }
        if (props.phoneNumbers) { mutable.phoneNumbers = [...props.phoneNumbers]; }
        if (props.addresses) { mutable.addresses = [...props.addresses]; }
        if (props.urls) { mutable.urls = [...props.urls]; }
      });
      return false;
    }

    yield* Database.add(Person.make(props));
    return true;
  });

const syncOneGroup = (integration: Integration.Integration, groupResourceName: string) =>
  Effect.gen(function* () {
    log('syncing google contact group', { groupResourceName });
    const memberNames = yield* fetchGroupMembers(groupResourceName);
    if (memberNames.length === 0) {
      log('contact group is empty', { groupResourceName });
      return 0;
    }

    const people = yield* fetchPeopleInBatches(memberNames);
    log('fetched group members', { groupResourceName, count: people.length });

    let upserted = 0;
    yield* Stream.fromIterable(people).pipe(
      Stream.grouped(10),
      Stream.mapEffect((batch) =>
        Effect.gen(function* () {
          for (const person of Chunk.toArray(batch)) {
            const created = yield* upsertPerson(person);
            if (created) { upserted++; }
          }
        }),
      ),
      Stream.runDrain,
    );

    // Persist last sync timestamp on the integration target.
    const targetIdx = integration.targets?.findIndex((t) => t.remoteId === groupResourceName) ?? -1;
    if (targetIdx >= 0) {
      Obj.update(integration, (integration) => {
        const mutable = integration as Obj.Mutable<typeof integration>;
        mutable.targets[targetIdx] = { ...mutable.targets[targetIdx], cursor: new Date().toISOString() };
      });
    }

    log('contact group sync complete', { groupResourceName, upserted, total: people.length });
    return upserted;
  });

export default GoogleContactsSync.pipe(
  Operation.withHandler(
    ({ integration: integrationRef, contactGroupResourceName }) =>
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
