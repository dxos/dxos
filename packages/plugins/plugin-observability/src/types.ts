//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

import { OBSERVABILITY_PLUGIN } from './meta';

const nonEmpty = <S extends Schema.Schema.Any>(field: string) =>
  Schema.nonEmptyString<S>({ message: () => `Missing field: ${field}` });

const maxLength = <S extends Schema.Schema.Any>(field: string, length: number) =>
  Schema.maxLength<S>(length, { message: () => `Exceeds max length (${length}): ${field}` });

export const UserFeedback = Schema.Struct({
  message: Schema.String.pipe(nonEmpty('Feedback'), maxLength('Feedback', 32_768)),
});

export type UserFeedback = Schema.Schema.Type<typeof UserFeedback>;

const OBSERVABILITY_ACTION = `${OBSERVABILITY_PLUGIN}/action`;

export namespace ObservabilityAction {
  export class Toggle extends Schema.TaggedClass<Toggle>()(`${OBSERVABILITY_ACTION}/toggle`, {
    input: Schema.Struct({
      state: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Boolean,
  }) {}

  export class CaptureUserFeedback extends Schema.TaggedClass<CaptureUserFeedback>()(
    `${OBSERVABILITY_ACTION}/capture-feedback`,
    {
      input: UserFeedback,
      output: Schema.Void,
    },
  ) {}

  /** Base intent for sending events. */
  export class BaseSendEvent extends Schema.TaggedClass<BaseSendEvent>()(`${OBSERVABILITY_ACTION}/send-event`, {
    input: Schema.Struct({
      name: Schema.String,
      properties: Schema.optional(Schema.Object),
    }),
    output: Schema.Void,
  }) {}

  /** Intent with strict types for first-party events. */
  export class SendEvent extends Schema.TaggedClass<SendEvent>()(`${OBSERVABILITY_ACTION}/send-event`, {
    // NOTE: Sort alphabetically by name.
    input: Schema.Union(
      Schema.Struct({
        name: Schema.Literal('identity.create'),
      }),
      Schema.Struct({
        name: Schema.Literal('identity.join'),
      }),
      Schema.Struct({
        name: Schema.Literal('identity.recover'),
      }),
      Schema.Struct({
        name: Schema.Literal('identity.share'),
      }),
      Schema.Struct({
        name: Schema.Literal('navigation.activate'),
        properties: Schema.Struct({
          subjectId: Schema.String,
          typename: Schema.optional(Schema.String),
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('page.load'),
        properties: Schema.Struct({
          loadDuration: Schema.Number,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('plugins.toggle'),
        properties: Schema.Struct({
          plugin: Schema.String,
          enabled: Schema.Boolean,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.create'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.join'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.limit'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.lock'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.migrate'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          targetVersion: Schema.optional(Schema.String),
          version: Schema.optional(Schema.String),
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.schema.use'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          typename: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.schema.add'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          objectId: Schema.String,
          typename: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.object.add'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          objectId: Schema.String,
          typename: Schema.optional(Schema.String),
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.share'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('space.unlock'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.create'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.delete'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.message.add'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
          threadLength: Schema.Number,
          messageId: Schema.String,
          messageLength: Schema.Number,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.message.delete'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
          messageId: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.message.undo-delete'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
          messageId: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.message.update'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          messageId: Schema.String,
          messageLength: Schema.Number,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.toggle-resolved'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
        }),
      }),
      Schema.Struct({
        name: Schema.Literal('threads.undo-delete'),
        properties: Schema.Struct({
          spaceId: Type.SpaceId,
          threadId: Schema.String,
        }),
      }),
    ),
    output: Schema.Void,
  }) {}
}
