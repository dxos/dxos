//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { withAuthorization } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { GoogleContacts } from '#apis';
import { GoogleOperation } from '#types';

import { AccessTokenNotPopulatedError } from '../../../errors';

const CONTACT_GROUPS_BASE_URL = 'https://people.googleapis.com/v1/contactGroups';

const listAllContactGroups = (token: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const client = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
    );

    const groups: GoogleContacts.ContactGroup[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(CONTACT_GROUPS_BASE_URL);
      url.searchParams.set('pageSize', '200');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }
      const body = yield* HttpClientRequest.get(url.toString()).pipe(
        client.execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleContacts.ListContactGroupsResponse)),
        Effect.scoped,
      );
      groups.push(...(body.contactGroups ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return groups;
  });

const handler: Operation.WithHandler<typeof GoogleOperation.GetGoogleContactGroups> =
  GoogleOperation.GetGoogleContactGroups.pipe(
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
