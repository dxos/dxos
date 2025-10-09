//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Tag } from '../../types';

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/labels
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
//

export const LabelsResponse = Schema.Struct({
  labels: Schema.Array(Tag),
});

export type LabelsResponse = Schema.Schema.Type<typeof LabelsResponse>;

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/messages
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
//

export const Message = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
});

export type Message = Schema.Schema.Type<typeof Message>;

export const MessagesResponse = Schema.Struct({
  messages: Schema.Array(Message),
  nextPageToken: Schema.optional(Schema.String),
});

export type MessagesResponse = Schema.Schema.Type<typeof MessagesResponse>;

//
// https://gmail.googleapis.com/gmail/v1/users/{userId}/messages/{messageId}
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
//

export const MessageDetails = Schema.Struct({
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

export type MessageDetails = Schema.Schema.Type<typeof MessageDetails>;
