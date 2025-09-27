//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

export const Label = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
});
export type Label = Schema.Schema.Type<typeof Label>;

export const LabelsResponse = Schema.Struct({
  labels: Schema.Array(Label),
});
export type LabelsResponse = Schema.Schema.Type<typeof LabelsResponse>;

export const Message = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
});
export type Message = Schema.Schema.Type<typeof Message>;

export const ListMessagesResponse = Schema.Struct({
  messages: Schema.Array(Message),
  nextPageToken: Schema.optional(Schema.String),
});
export type ListMessagesResponse = Schema.Schema.Type<typeof ListMessagesResponse>;

export const MessageDetails = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  internalDate: Schema.String,
  labelIds: Schema.Array(Schema.String),
  payload: Schema.Struct({
    headers: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
    body: Schema.optional(Schema.Struct({ size: Schema.Number, data: Schema.optional(Schema.String) })),
    parts: Schema.optional(
      Schema.Array(
        Schema.Struct({
          mimeType: Schema.String,
          body: Schema.Struct({ size: Schema.Number, data: Schema.optional(Schema.String) }),
        }),
      ),
    ),
  }),
});
export type MessageDetails = Schema.Schema.Type<typeof MessageDetails>;
