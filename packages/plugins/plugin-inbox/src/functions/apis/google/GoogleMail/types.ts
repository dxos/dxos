//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/labels
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
//

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
  resultSizeEstimate: Schema.Number,
  messages: Schema.Array(Message.pick('id', 'threadId')).pipe(Schema.optional),
  nextPageToken: Schema.String.pipe(Schema.optional),
});

export type ListMessagesResponse = Schema.Schema.Type<typeof ListMessagesResponse>;
