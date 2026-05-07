//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';

import { AccessTokenNotPopulatedError, IntegrationDatabaseMissingError } from '../errors';
import { GetGoogleContactGroups } from './definitions';

const CONTACT_GROUPS_URL = 'https://people.googleapis.com/v1/contactGroups?pageSize=200';

const ContactGroupsItem = Schema.Struct({
  resourceName: Schema.String,
  name: Schema.String,
  groupType: Schema.optional(Schema.String),
  memberCount: Schema.optional(Schema.Number),
});

const ContactGroupsResponse = Schema.Struct({
  contactGroups: Schema.optional(Schema.Array(ContactGroupsItem)),
  nextPageToken: Schema.optional(Schema.String),
});

const listContactGroups = (token: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const client = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    const body = yield* HttpClientRequest.get(CONTACT_GROUPS_URL).pipe(
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(ContactGroupsResponse)),
      Effect.scoped,
    );
    return body.contactGroups ?? [];
  });

const handler: Operation.WithHandler<typeof GetGoogleContactGroups> = GetGoogleContactGroups.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const integrationObj = yield* Database.load(integration);
        const accessToken = yield* Database.load(integrationObj.accessToken);
        if (!accessToken.token) {
          return yield* Effect.fail(new AccessTokenNotPopulatedError());
        }

        const groups = yield* listContactGroups(accessToken.token).pipe(
          Effect.provide(FetchHttpClient.layer),
        );

        // Include user-created groups and the well-known "myContacts" system group.
        const targets = groups
          .filter(
            (group) =>
              group.groupType === 'USER_CONTACT_GROUP' || group.resourceName === 'contactGroups/myContacts',
          )
          .map((group) => ({
            id: group.resourceName,
            name: group.name,
            description:
              group.memberCount !== undefined
                ? `${group.memberCount} contact${group.memberCount === 1 ? '' : 's'}`
                : undefined,
          }));

        return { targets };
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;
