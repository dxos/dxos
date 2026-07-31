//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';

import { createUrl, makeGoogleApiRequest } from '../google-api';
import {
  BatchGetPeopleResponse,
  ContactGroupResponse,
  ListConnectionsResponse,
  ListContactGroupsResponse,
} from './types';

/**
 * Google People API.
 * https://developers.google.com/people/api/rest/v1
 */
const API_URL = 'https://people.googleapis.com/v1';

/**
 * Fields to request for each person.
 * `resourceName` and `etag` are metadata returned automatically and must NOT appear here.
 */
const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,addresses,birthdays,biographies,photos,organizations,urls';

/**
 * Lists all contact groups for the authenticated user.
 * https://developers.google.com/people/api/rest/v1/contactGroups/list
 */
export const listContactGroups = Effect.fn(function* (pageToken?: string) {
  const url = createUrl([API_URL, 'contactGroups'], {
    pageSize: 200,
    ...(pageToken ? { pageToken } : {}),
  }).toString();
  const response = yield* makeGoogleApiRequest(url);
  return yield* Schema.decodeUnknown(ListContactGroupsResponse)(response);
});

/**
 * Fetches a contact group by resource name, including member resource names.
 * https://developers.google.com/people/api/rest/v1/contactGroups/get
 */
export const getContactGroup = Effect.fn(function* (resourceName: string, maxMembers = 1000) {
  const url = createUrl([API_URL, resourceName], { maxMembers }).toString();
  const response = yield* makeGoogleApiRequest(url);
  return yield* Schema.decodeUnknown(ContactGroupResponse)(response);
});

/**
 * Batch gets up to 200 people by resource names.
 * https://developers.google.com/people/api/rest/v1/people/getBatchGet
 */
export const batchGetPeople = Effect.fn(function* (resourceNames: readonly string[]) {
  const url = new URL(`${API_URL}/people:batchGet`);
  for (const name of resourceNames) {
    url.searchParams.append('resourceNames', name);
  }
  url.searchParams.set('personFields', PERSON_FIELDS);
  const response = yield* makeGoogleApiRequest(url.toString());
  return yield* Schema.decodeUnknown(BatchGetPeopleResponse)(response);
});

/**
 * Lists all connections (contacts) for the authenticated user with optional sync token.
 * https://developers.google.com/people/api/rest/v1/people.connections/list
 */
export const listConnections = Effect.fn(function* (opts: {
  pageToken?: string;
  syncToken?: string;
  requestSyncToken?: boolean;
}) {
  const url = createUrl([API_URL, 'people/me/connections'], {
    personFields: PERSON_FIELDS,
    pageSize: 1000,
    requestSyncToken: opts.requestSyncToken ? true : undefined,
    ...(opts.syncToken ? { syncToken: opts.syncToken } : {}),
    ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
  }).toString();
  const response = yield* makeGoogleApiRequest(url);
  return yield* Schema.decodeUnknown(ListConnectionsResponse)(response);
});
