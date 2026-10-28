//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

// eslint-disable-next-line unused-imports/no-unused-imports
import * as Credential from '@dxos/compute/Credential';

import { createUrl, makeGoogleApiRequest } from '../google-api.ts';
import {
  ErrorResponse,
  GoogleError,
  HistoryResponse,
  Label,
  LabelsResponse,
  ListMessagesResponse,
  Message,
  MessagePartBody,
  MessageRef,
  Profile,
  RawMessage,
} from './types.ts';

// TODO(dmaretskyi): There's probably a better way to do it by moving this into the oauth client.
const decodeAndHandleErrors =
  <S extends Schema.Top>(schema: S) =>
  (data: unknown): Effect.Effect<S['Type'], GoogleError | Schema.SchemaError, S['DecodingServices']> =>
    // The API error envelope is checked first: v4 decodes the union to `S['Type'] | ErrorResponse`,
    // and an `in` test cannot narrow a generic member out of that.
    Schema.decodeUnknownEffect(Schema.Union([ErrorResponse, schema]))(data).pipe(
      Effect.flatMap((response) =>
        Schema.is(ErrorResponse)(response)
          ? Effect.fail(GoogleError.fromErrorResponse(response))
          : Effect.succeed(response as S['Type']),
      ),
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
 * Adds and/or removes labels on one message (requires the `gmail.modify` scope).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify
 *
 * `SPAM` is accepted here as an ordinary label (verified against a live account); `TRASH` is not —
 * that is {@link trashMessage}.
 */
export const modifyMessage = Effect.fn('modifyMessage')(function* (
  userId: string,
  messageId: string,
  labels: { addLabelIds?: readonly string[]; removeLabelIds?: readonly string[] },
) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId, 'modify']).toString();
  return yield* makeGoogleApiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ addLabelIds: labels.addLabelIds ?? [], removeLabelIds: labels.removeLabelIds ?? [] }),
  }).pipe(Effect.flatMap(decodeAndHandleErrors(Message)));
});

/**
 * Applies the same label changes to up to 1000 messages in one call (requires `gmail.modify`).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchModify
 *
 * Returns `204 No Content` with an empty body on success, so unlike {@link modifyMessage} there is
 * nothing to decode — the response is discarded and only its status matters.
 */
export const batchModifyMessages = Effect.fn('batchModifyMessages')(function* (
  userId: string,
  messageIds: readonly string[],
  labels: { addLabelIds?: readonly string[]; removeLabelIds?: readonly string[] },
) {
  const url = createUrl([API_URL, 'users', userId, 'messages', 'batchModify']).toString();
  yield* makeGoogleApiRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      ids: [...messageIds],
      addLabelIds: labels.addLabelIds ?? [],
      removeLabelIds: labels.removeLabelIds ?? [],
    }),
  });
});

/**
 * Moves a message to the trash (requires the `gmail.modify` scope).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/trash
 */
export const trashMessage = Effect.fn('trashMessage')(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId, 'trash']).toString();
  return yield* makeGoogleApiRequest(url, { method: 'POST' }).pipe(Effect.flatMap(decodeAndHandleErrors(Message)));
});

/**
 * Gets a message as its whole RFC 2822 text (base64url in `raw`), byte for byte as Gmail stores it.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getRawMessage = Effect.fn('getRawMessage')(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId], { format: 'raw' }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(RawMessage)));
});

/**
 * Puts a message straight into the mailbox, as if delivered now, without sending it or running filters
 * (requires `gmail.modify`). Its internal date is the time of the call.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/insert
 */
export const insertMessage = Effect.fn('insertMessage')(function* (
  userId: string,
  message: { raw: string; labelIds?: readonly string[] },
) {
  const url = createUrl([API_URL, 'users', userId, 'messages'], { internalDateSource: 'receivedTime' }).toString();
  return yield* makeGoogleApiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ raw: message.raw, labelIds: message.labelIds ?? [] }),
  }).pipe(Effect.flatMap(decodeAndHandleErrors(MessageRef)));
});

/**
 * Imports a message as received mail: never marked spam, and dated by its own `Date` header rather than
 * the time of the call (requires `gmail.modify`).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/import
 */
export const importMessage = Effect.fn('importMessage')(function* (
  userId: string,
  message: { raw: string; labelIds?: readonly string[] },
) {
  const url = createUrl([API_URL, 'users', userId, 'messages', 'import'], {
    internalDateSource: 'dateHeader',
    neverMarkSpam: true,
    processForCalendar: false,
  }).toString();
  return yield* makeGoogleApiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ raw: message.raw, labelIds: message.labelIds ?? [] }),
  }).pipe(Effect.flatMap(decodeAndHandleErrors(MessageRef)));
});

/**
 * Creates a user label (requires `gmail.modify` or `gmail.labels`).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/create
 */
export const createLabel = Effect.fn('createLabel')(function* (userId: string, name: string) {
  const url = createUrl([API_URL, 'users', userId, 'labels']).toString();
  return yield* makeGoogleApiRequest(url, { method: 'POST', body: JSON.stringify({ name }) }).pipe(
    Effect.flatMap(decodeAndHandleErrors(Label)),
  );
});

/**
 * Deletes a user label; its messages keep their other labels (requires `gmail.modify` or `gmail.labels`).
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/delete
 *
 * Returns `204 No Content`, so there is nothing to decode.
 */
export const deleteLabel = Effect.fn('deleteLabel')(function* (userId: string, labelId: string) {
  const url = createUrl([API_URL, 'users', userId, 'labels', labelId]).toString();
  yield* makeGoogleApiRequest(url, { method: 'DELETE' });
});
