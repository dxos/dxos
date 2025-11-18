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

export class GoogleError extends BaseError.extend('GOOGLE_ERROR') {
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

export const Message = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  labelIds: Schema.Array(Schema.String),
  snippet: Schema.String,
  internalDate: Schema.String,
  payload: Schema.Struct({
    headers: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        value: Schema.String,
      }),
    ),
    body: Schema.optional(
      Schema.Struct({
        size: Schema.Number,
        data: Schema.optional(Schema.String),
      }),
    ),
    parts: Schema.optional(
      Schema.Array(
        Schema.Struct({
          mimeType: Schema.String,
          body: Schema.Struct({
            size: Schema.Number,
            data: Schema.optional(Schema.String),
          }),
        }),
      ),
    ),
  }),
});

export type Message = Schema.Schema.Type<typeof Message>;

export const ListMessagesResponse = Schema.Struct({
  messages: Schema.Array(Message.pick('id', 'threadId')),
  nextPageToken: Schema.optional(Schema.String),
});

export type ListMessagesResponse = Schema.Schema.Type<typeof ListMessagesResponse>;
