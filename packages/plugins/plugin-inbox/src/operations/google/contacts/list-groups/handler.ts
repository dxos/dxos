//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/compute-runtime';

import { GooglePeople } from '../../../../apis';
import { AccessTokenNotPopulatedError } from '../../../../errors';
import { InboxOperation } from '../../../../types';

const CONTACT_GROUPS_BASE_URL = 'https://people.googleapis.com/v1/contactGroups';

const listAllContactGroups = (token: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const client = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const groups: GooglePeople.ContactGroup[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(CONTACT_GROUPS_BASE_URL);
      url.searchParams.set('pageSize', '200');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }
      const body = yield* HttpClientRequest.get(url.toString()).pipe(
        client.execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(GooglePeople.ListContactGroupsResponse)),
        Effect.scoped,
      );
      groups.push(...(body.contactGroups ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return groups;
  });

const handler: Operation.WithHandler<typeof InboxOperation.GetGoogleContactGroups> =
  InboxOperation.GetGoogleContactGroups.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ connection }) {
        const target = connection.target;
        const db = target ? Obj.getDatabase(target) : undefined;
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const connectionObj = yield* Database.load(connection);
          const accessToken = yield* Database.load(connectionObj.accessToken);
          if (!accessToken.token) {
            return yield* Effect.fail(new AccessTokenNotPopulatedError());
          }

          const groups = yield* listAllContactGroups(accessToken.token).pipe(Effect.provide(FetchHttpClient.layer));

          const targets = groups.map((group) => ({
            id: group.resourceName,
            name: group.formattedName ?? group.name,
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
