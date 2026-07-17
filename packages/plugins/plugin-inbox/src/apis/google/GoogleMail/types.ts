//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/labels
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
//

export const ErrorResponse = Schema.Struct({
  error: Schema.Struct({
    code: Schema.Number,
    message: Schema.String,
    status: Schema.optional(Schema.String),
    errors: Schema.optional(
      Schema.Array(
        Schema.Struct({
          message: Schema.optional(Schema.String),
          domain: Schema.optional(Schema.String),
          reason: Schema.optional(Schema.String),
          location: Schema.optional(Schema.String),
          locationType: Schema.optional(Schema.String),
        }),
      ),
    ),
  }),
});

export interface ErrorResponse extends Schema.Schema.Type<typeof ErrorResponse> {}

export class GoogleError extends BaseError.extend('GoogleError') {
  errors?: ErrorResponse['error']['errors'] = undefined;

  static fromErrorResponse(response: ErrorResponse) {
    const error = new GoogleError({
      message: `${response.error.code} ${response.error.status ?? ''}: ${response.error.message}`,
    });
    error.errors = response.error.errors;
    return error;
  }
}

export const Label = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  name: Schema.String,
});

export type Label = Schema.Schema.Type<typeof Label>;

export const LabelsResponse = Schema.Struct({
  labels: Schema.Array(Label),
});

export type LabelsResponse = Schema.Schema.Type<typeof LabelsResponse>;

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/messages/{messageId}
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
//

/** A `MessagePart` body: inline data (≤ ~size), or an `attachmentId` to fetch separately when large. */
export const MessagePartBody = Schema.Struct({
  size: Schema.Number,
  data: Schema.optional(Schema.String),
  attachmentId: Schema.optional(Schema.String),
});
export type MessagePartBody = Schema.Schema.Type<typeof MessagePartBody>;

/** A single RFC 2822 header (`name`/`value` pair) on a message or MIME part. */
export const Header = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
});
export type Header = Schema.Schema.Type<typeof Header>;

/**
 * A MIME part of a message. Recursive: multipart parts (e.g. `multipart/mixed`) nest further parts —
 * attachments are leaf parts carrying `filename` and `body.attachmentId`. `headers` carries the part's
 * own MIME headers (e.g. `Content-ID`, used to match an inline attachment to a `cid:` reference in an
 * HTML body) — distinct from `Message.payload.headers`, which are the top-level message headers.
 */
const _Part = Schema.Struct({
  mimeType: Schema.String,
  filename: Schema.optional(Schema.String),
  headers: Schema.optional(Schema.Array(Header)),
  body: MessagePartBody,
  parts: Schema.optional(Schema.Array(Schema.suspend((): Schema.Schema<Part> => Part))),
});
export interface Part extends Schema.Schema.Type<typeof _Part> {}
export const Part: Schema.Schema<Part> = _Part;

export const Message = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  // Not present on every real message (e.g. some messages without any labels) despite the Gmail
  // API reference implying it's always populated — `mapToMessage` defaults to `[]`.
  labelIds: Schema.optional(Schema.Array(Schema.String)),
  snippet: Schema.String,
  internalDate: Schema.String,
  payload: Schema.Struct({
    headers: Schema.Array(Header),
    body: Schema.optional(
      Schema.Struct({
        size: Schema.Number,
        data: Schema.optional(Schema.String),
      }),
    ),
    parts: Schema.optional(Schema.Array(Part)),
  }),
});

export type Message = Schema.Schema.Type<typeof Message>;

export const ListMessagesResponse = Schema.Struct({
  resultSizeEstimate: Schema.Number,
  messages: Schema.Array(Message.pick('id', 'threadId')).pipe(Schema.optional),
  nextPageToken: Schema.String.pipe(Schema.optional),
});

export type ListMessagesResponse = Schema.Schema.Type<typeof ListMessagesResponse>;

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/profile
// https://gmail.googleapis.com/gmail/v1/users/{userId}/history
//

/**
 * users.getProfile — only `historyId` (the delta-resume token) is used by incremental sync. Optional
 * defensively: a provider/dataset without delta support returns none, which keeps sync on the
 * `max`/`min` window scan.
 */
export const Profile = Schema.Struct({
  emailAddress: Schema.optional(Schema.String),
  messagesTotal: Schema.optional(Schema.Number),
  threadsTotal: Schema.optional(Schema.Number),
  historyId: Schema.optional(Schema.String),
});
export type Profile = Schema.Schema.Type<typeof Profile>;

/** A message reference inside a history record (id + optional labelIds carried by label deltas). */
const HistoryMessage = Schema.Struct({
  id: Schema.String,
  threadId: Schema.optional(Schema.String),
  labelIds: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * One `users.history.list` record: message additions/deletions and per-message label changes since the
 * prior `historyId` (RFC-style delta). Every sub-list is optional — a record carries only the change
 * kinds that occurred.
 */
export const HistoryRecord = Schema.Struct({
  id: Schema.String,
  messagesAdded: Schema.optional(Schema.Array(Schema.Struct({ message: HistoryMessage }))),
  messagesDeleted: Schema.optional(Schema.Array(Schema.Struct({ message: HistoryMessage }))),
  labelsAdded: Schema.optional(
    Schema.Array(Schema.Struct({ message: HistoryMessage, labelIds: Schema.Array(Schema.String) })),
  ),
  labelsRemoved: Schema.optional(
    Schema.Array(Schema.Struct({ message: HistoryMessage, labelIds: Schema.Array(Schema.String) })),
  ),
});
export type HistoryRecord = Schema.Schema.Type<typeof HistoryRecord>;

export const HistoryResponse = Schema.Struct({
  history: Schema.optional(Schema.Array(HistoryRecord)),
  historyId: Schema.String,
  nextPageToken: Schema.optional(Schema.String),
});
export type HistoryResponse = Schema.Schema.Type<typeof HistoryResponse>;
