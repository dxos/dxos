//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Progress from '@dxos/app-toolkit/Progress';
import * as Credential from '@dxos/compute/Credential';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Query, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as InboxResolver from '@dxos/extractor-lib';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Organization, Person } from '@dxos/types';

import { type GoogleContacts } from '#apis';
import { GoogleCredentials } from '#services';

import { GOOGLE_CONTACTS_CONNECTOR_ID, GOOGLE_INTEGRATION_SOURCE } from '../../../constants.ts';
import { syncContactGroup } from './handler.ts';

const TYPES = [Person.Person, Organization.Organization, AccessToken.AccessToken, Connection.Connection, Cursor.Cursor];

const GROUP_RESOURCE_NAME = 'contactGroups/friends';

const makeContact = (index: number): GoogleContacts.Person => ({
  resourceName: `people/c${index}`,
  names: [{ displayName: `Contact ${index}`, givenName: 'Contact', familyName: `${index}` }],
  emailAddresses: [{ value: `contact${index}@example.com` }],
});

/** Serves `contactGroups.get` and `people.connections.list` from fixed data, like the People API. */
const mockPeopleApi = ({ members, others }: { members: GoogleContacts.Person[]; others: GoogleContacts.Person[] }) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      const body = request.url.includes(GROUP_RESOURCE_NAME)
        ? {
            resourceName: GROUP_RESOURCE_NAME,
            name: 'Friends',
            memberCount: members.length,
            memberResourceNames: members.map((member) => member.resourceName),
          }
        : { connections: [...members, ...others] };
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 })));
    }),
  );

const credentials = Layer.succeed(Credential.CredentialsService, {
  getCredential: async () => ({ service: GOOGLE_INTEGRATION_SOURCE, apiKey: 'token' }),
  queryCredentials: async () => [{ service: GOOGLE_INTEGRATION_SOURCE, apiKey: 'token' }],
});

describe('contact group sync against a mock People API', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reports one meter per group, sized by the member count before any contact is counted', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: TYPES });
    const accessToken = db.add(AccessToken.make({ source: GOOGLE_INTEGRATION_SOURCE, token: 'token' }));
    const connection = db.add(
      Connection.make({ connectorId: GOOGLE_CONTACTS_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
    );
    // Contacts bindings are targetless: the cursor targets the connection itself.
    const binding = db.add(
      Cursor.makeExternal({
        source: Ref.make(accessToken),
        target: Ref.make(connection),
        externalId: GROUP_RESOURCE_NAME,
        label: 'Friends',
      }),
    );
    await db.flush({ indexes: true });

    // More members than one commit page, plus contacts outside the group that must not be counted.
    const members = Array.from({ length: 12 }, (_unused, index) => makeContact(index));
    const others = Array.from({ length: 3 }, (_unused, index) => makeContact(100 + index));

    const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
    const traceLayer = Trace.testTraceService().pipe(
      Layer.provide(
        Layer.succeed(Trace.TraceSink, {
          write: (message) => {
            for (const event of Trace.flatten(message)) {
              if (Trace.isOfType(Trace.StatusUpdate, event)) {
                statusUpdates.push(event.data);
              }
            }
          },
        }),
      ),
    );

    const { outputs } = await EffectEx.runPromise(
      Binding.syncAll({ connection: Ref.make(connection), sync: syncContactGroup }).pipe(
        Effect.provide(
          Layer.mergeAll(
            mockPeopleApi({ members, others }),
            GoogleCredentials.default,
            credentials,
            Database.layer(db),
            InboxResolver.Live.pipe(Layer.provide(Database.layer(db))),
            traceLayer,
          ),
        ),
      ),
    );

    const upserted = outputs.reduce((total, output) => total + output.upserted, 0);
    expect(upserted).toBe(members.length);
    expect((await db.query(Query.select(Filter.type(Person.Person))).run()).length).toBe(members.length);

    const firstTotal = statusUpdates.findIndex((update) => update.progress?.total !== undefined);
    const firstCount = statusUpdates.findIndex((update) => (update.progress?.current ?? 0) > 0);
    expect(statusUpdates[firstTotal]?.progress?.total).toBe(members.length);
    expect(firstTotal).toBeGreaterThan(-1);
    expect(firstTotal).toBeLessThan(firstCount);

    const counts = statusUpdates.flatMap((update) =>
      update.progress?.current === undefined ? [] : [update.progress.current],
    );
    expect(counts.at(-1)).toBe(upserted);
    expect(statusUpdates[0]?.message).toBe('Syncing Friends');
    expect(statusUpdates.at(-1)?.message).toBe(Progress.STATUS_COMPLETE);
    expect(statusUpdates.every((update) => update.progress?.key === Progress.createSyncKey(binding))).toBe(true);
  });
});
