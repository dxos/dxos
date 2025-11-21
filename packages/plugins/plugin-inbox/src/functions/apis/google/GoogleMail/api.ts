//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

import { createUrl, makeGoogleApiRequest } from '../google-api';

import { ErrorResponse, GoogleError, LabelsResponse, ListMessagesResponse, Message } from './types';

// TODO(dmaretskyi): There's probably a better way to do it by moving this into the oauth client.
const decodeAndHandleErrors =
  <S extends Schema.Schema.Any>(schema: S) =>
  (
    data: unknown,
  ): Effect.Effect<Schema.Schema.Type<S>, GoogleError | ParseResult.ParseError, Schema.Schema.Context<S>> =>
    Schema.decodeUnknown(Schema.Union(schema, ErrorResponse))(data).pipe(
      Effect.flatMap((response) => {
        if ('error' in response) {
          return Effect.fail(GoogleError.fromErrorResponse(response));
        } else {
          return Effect.succeed(response);
        }
      }),
    );

/**
 * NOTE: Google API bundles size is v. large and caused runtime issues.
 */
const API_URL = 'https://gmail.googleapis.com/gmail/v1';

export const SYSTEM_LABELS = [
  'CATEGORY_PERSONAL',
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
  'CHAT',
  'DRAFT',
  'INBOX',
  'IMPORTANT',
  'SENT',
  'SPAM',
  'STARRED',
  'TRASH',
  'UNREAD',
  'YELLOW_STAR',
];

// TODO(burdon): Factor out.
export const isSystemLabel = (label: string): boolean => SYSTEM_LABELS.includes(label);

/**
 * Lists the labels in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
 */
export const listLabels = Effect.fn(function* (userId: string) {
  const url = createUrl([API_URL, 'users', userId, 'labels']).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(LabelsResponse)));
});

/**
 * Lists the messages in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
 */
export const listMessages = Effect.fn(function* (
  userId: string,
  q: string,
  pageSize: number,
  pageToken?: string | undefined,
) {
  const url = createUrl([API_URL, 'users', userId, 'messages'], { q, pageSize, pageToken }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(ListMessagesResponse)));
});

/**
 * Gets the specified message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(Message)));
});
