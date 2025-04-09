//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { OBSERVABILITY_PLUGIN } from './meta';

const Email = S.String.pipe(
  S.nonEmptyString({ message: () => 'Email is required.' }),
  S.pattern(/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i, {
    message: () => 'Invalid email address.',
  }),
);

const nonEmpty = <S extends S.Schema.Any>(field: string) =>
  S.nonEmptyString<S>({ message: () => `Missing field: ${field}` });

const maxLength = <S extends S.Schema.Any>(field: string, length: number) =>
  S.maxLength<S>(length, { message: () => `Exceeds max length (${length}): ${field}` });

export const UserFeedback = S.Struct({
  name: S.String.pipe(nonEmpty('Name'), maxLength('Name', 256)),
  email: Email.pipe(maxLength('Email', 256)),
  message: S.String.pipe(nonEmpty('Feedback'), maxLength('Feedback', 32_768)),
});

export type UserFeedback = S.Schema.Type<typeof UserFeedback>;

const OBSERVABILITY_ACTION = `${OBSERVABILITY_PLUGIN}/action`;

export namespace ObservabilityAction {
  export class Toggle extends S.TaggedClass<Toggle>()(`${OBSERVABILITY_ACTION}/toggle`, {
    input: S.Struct({
      state: S.optional(S.Boolean),
    }),
    output: S.Boolean,
  }) {}

  export class CaptureUserFeedback extends S.TaggedClass<CaptureUserFeedback>()(
    `${OBSERVABILITY_ACTION}/capture-feedback`,
    {
      input: UserFeedback,
      output: S.Void,
    },
  ) {}

  /** Base intent for sending events. */
  export class BaseSendEvent extends S.TaggedClass<BaseSendEvent>()(`${OBSERVABILITY_ACTION}/send-event`, {
    input: S.Struct({
      name: S.String,
      properties: S.optional(S.Object),
    }),
    output: S.Void,
  }) {}

  /** Intent with strict types for first-party events. */
  export class SendEvent extends S.TaggedClass<SendEvent>()(`${OBSERVABILITY_ACTION}/send-event`, {
    // NOTE: Sort alphabetically by name.
    input: S.Union(
      S.Struct({
        name: S.Literal('identity.create'),
      }),
      S.Struct({
        name: S.Literal('identity.join'),
      }),
      S.Struct({
        name: S.Literal('identity.recover'),
      }),
      S.Struct({
        name: S.Literal('identity.share'),
      }),
      S.Struct({
        name: S.Literal('navigation.activate'),
        properties: S.Struct({
          subjectId: S.String,
          typename: S.optional(S.String),
        }),
      }),
      S.Struct({
        name: S.Literal('page.load'),
        properties: S.Struct({
          loadDuration: S.Number,
        }),
      }),
      S.Struct({
        name: S.Literal('plugins.toggle'),
        properties: S.Struct({
          plugin: S.String,
          enabled: S.Boolean,
        }),
      }),
      S.Struct({
        name: S.Literal('space.create'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('space.join'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('space.limit'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('space.lock'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('space.migrate'),
        properties: S.Struct({
          spaceId: S.String,
          targetVersion: S.optional(S.String),
          version: S.optional(S.String),
        }),
      }),
      S.Struct({
        name: S.Literal('space.object.add'),
        properties: S.Struct({
          spaceId: S.String,
          objectId: S.String,
          typename: S.optional(S.String),
        }),
      }),
      S.Struct({
        name: S.Literal('space.share'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('space.unlock'),
        properties: S.Struct({
          spaceId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.create'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.delete'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.message.add'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
          threadLength: S.Number,
          messageId: S.String,
          messageLength: S.Number,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.message.delete'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
          messageId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.message.undo-delete'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
          messageId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.message.update'),
        properties: S.Struct({
          spaceId: S.String,
          messageId: S.String,
          messageLength: S.Number,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.toggle-resolved'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
        }),
      }),
      S.Struct({
        name: S.Literal('threads.undo-delete'),
        properties: S.Struct({
          spaceId: S.String,
          threadId: S.String,
        }),
      }),
    ),
    output: S.Void,
  }) {}
}
