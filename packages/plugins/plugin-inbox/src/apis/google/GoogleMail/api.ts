//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';

import { createUrl, makeGoogleApiRequest } from '../google-api';
import {
  ErrorResponse,
  GoogleError,
  HistoryResponse,
  LabelsResponse,
  ListMessagesResponse,
  Message,
  MessagePartBody,
  Profile,
} from './types';

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
 * Gets the user's mailbox profile — `historyId` is the delta-resume token for incremental sync.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile
 */
export const getProfile = Effect.fn(function* (userId: string) {
  const url = createUrl([API_URL, 'users', userId, 'profile']).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(Profile)));
});

/**
 * Lists the history of mailbox changes since `startHistoryId` (additions, deletions, label changes).
 * A `startHistoryId` older than the server's retention (~1 week) returns HTTP 404 — the caller's cue to
 * fall back to a full scan and recapture a fresh `historyId` via {@link getProfile}.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
 */
export const listHistory = Effect.fn(function* (
  userId: string,
  options: { startHistoryId: string; labelId?: string; pageToken?: string; maxResults?: number },
) {
  const url = createUrl([API_URL, 'users', userId, 'history'], {
    startHistoryId: options.startHistoryId,
    labelId: options.labelId,
    pageToken: options.pageToken,
    maxResults: options.maxResults,
  }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(HistoryResponse)));
});

/**
 * Gets the specified message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(Message)));
});

/**
 * Gets an attachment's bytes (base64url-encoded in `data`).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get
 */
export const getAttachment = Effect.fn(function* (userId: string, messageId: string, attachmentId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId, 'attachments', attachmentId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(MessagePartBody)));
});

/**
 * Sends a message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
 */
export const sendMessage = Effect.fn('sendMessage')(function* (
  userId: string,
  message: { raw: string; threadId?: string },
) {
  const url = createUrl([API_URL, 'users', userId, 'messages', 'send']).toString();
  return yield* makeGoogleApiRequest(url, { method: 'POST', body: JSON.stringify(message) }).pipe(
    Effect.flatMap(
      decodeAndHandleErrors(
        Schema.Struct({
          id: Schema.String,
          threadId: Schema.String,
          labelIds: Schema.Array(Schema.String),
        }),
      ),
    ),
  );
});

/**
 * Moves a message to the trash (requires the `gmail.modify` scope).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/trash
 */
export const trashMessage = Effect.fn('trashMessage')(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId, 'trash']).toString();
  return yield* makeGoogleApiRequest(url, { method: 'POST' }).pipe(Effect.flatMap(decodeAndHandleErrors(Message)));
});
