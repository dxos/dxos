//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
// @ts-ignore
import { create, defineFunction, Filter, ObjectId, S } from 'dxos:functions';
import {
  HttpClient,
  HttpClientRequest,
  FetchHttpClient,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.13.3';
// @ts-ignore
import { format, subDays } from 'https://esm.sh/date-fns@3.3.1';
// @ts-ignore
import { pipe, Chunk, Effect, Ref, Schedule, Stream } from 'https://esm.sh/effect@3.13.3';

import { Type } from '@dxos/echo';

// TODO(ZaymonFC): Calculate this dynamically and expose a parameter.
const DEFAULT_AFTER = '2025-01-01';

export default defineFunction({
  inputSchema: Schema.Struct({
    mailboxId: Schema.String,
    userId: Schema.optional(Schema.String).pipe(Schema.withDecodingDefault(() => 'me')),
    after: Schema.optional(Schema.Union(Schema.Number, Schema.String)).pipe(
      S.withDecodingDefault(() => format(subDays(new Date(), 30), 'yyyy-MM-dd')),
    ),
    pageSize: Schema.optional(Schema.Number),
    // TODO(wittjosiah): Remove. This is used to provide a terminal for a cron trigger.
    tick: Schema.optional(Schema.String),
  }),

  outputSchema: Schema.Struct({
    newMessages: Schema.Number,
  }),

  handler: ({
    context: { space },
    event: {
      data: { mailboxId, userId, after, pageSize = 100 },
    },
  }: any) =>
    Effect.gen(function* () {
      const { token } = yield* Effect.tryPromise({
        try: () => space.db.query(Filter.typename('dxos.org/type/AccessToken', { source: 'gmail.com' })).first(),
        catch: (e: any) => e,
      });

      // TODO(burdon): Use `googleapis`.
      const makeRequest = (url: string) =>
        pipe(
          url,
          HttpClientRequest.get,
          HttpClientRequest.setHeaders({ Authorization: `Bearer ${token}`, Accept: 'application/json' }),
          HttpClient.execute,
          Effect.flatMap((res: any) => res.json),
          Effect.timeout('1 second'),
          Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
          Effect.scoped,
        );

      const listMessages = (userId: string, q: string, pageSize: number, pageToken: string | null) =>
        makeRequest(getUrl(userId, undefined, { q, pageSize, pageToken }));

      const getMessage = (userId: string, messageId: string) => makeRequest(getUrl(userId, messageId));

      const mailbox = yield* Effect.tryPromise({
        try: () => space.db.query({ id: mailboxId }).first(),
        catch: (e: any) => e,
      });
      const { objects } = yield* Effect.tryPromise({
        try: () => space.queues.queryQueue(mailbox.queue.dxn),
        catch: (e: any) => e,
      });
      const newMessages = yield* Ref.make([]);
      const nextPage = yield* Ref.make(null);

      do {
        const last = objects.at(-1);
        const q = last
          ? `in:inbox after:${Math.floor(new Date(last.created).getTime() / 1000)}`
          : `in:inbox after:${after}`;
        const pageToken = yield* Ref.get(nextPage);
        const { messages, nextPageToken } = yield* listMessages(userId, q, pageSize, pageToken);
        yield* Ref.update(nextPage, () => nextPageToken);
        for (const message of messages) {
          const messageDetails = yield* getMessage(userId, message.id);
          const created = new Date(parseInt(messageDetails.internalDate)).toISOString();
          const from = messageDetails.payload.headers.find((h: any) => h.name === 'From');
          const sender = from && parseEmailString(from.value);
          // TODO(wittjosiah): Improve parsing of email contents.
          const content =
            messageDetails.payload.body?.data ??
            messageDetails.payload.parts?.find((p: any) => p.mimeType === 'text/plain')?.body.data;
          // Skip the message if content or sender is missing.
          // Skip the message if it's the same as the last message.
          // TODO(wittjosiah): This comparison should be done via foreignId probably.
          if (!content || !sender || created === last?.created) {
            continue;
          }
          const subject = messageDetails.payload.headers.find((h: any) => h.name === 'Subject')?.value;
          const object = create(MessageType, {
            id: ObjectId.random(),
            created,
            sender,
            blocks: [
              {
                type: 'text',
                text: Buffer.from(content, 'base64').toString('utf-8'),
              },
            ],
            properties: {
              subject,
              threadId: message.threadId,
            },
          });
          // TODO(wittjosiah): Set foreignId in object meta.
          yield* Ref.update(newMessages, (n: any) => [object, ...n]);
        }
      } while (yield* Ref.get(nextPage));

      const queueMessages = yield* Ref.get(newMessages);
      if (queueMessages.length > 0) {
        yield* pipe(
          queueMessages,
          Stream.fromIterable,
          Stream.grouped(10),
          Stream.flatMap((batch: any) =>
            Effect.tryPromise({
              try: () => space.queues.insertIntoQueue(mailbox.queue.dxn, Chunk.toReadonlyArray(batch)),
              catch: (e: any) => e,
            }),
          ),
          Stream.runDrain,
        );
      }

      return { newMessages: queueMessages.length };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});

const getUrl = (userId: string, messageId?: string, params?: Record<string, any>) => {
  const api = new URL(
    [`https://gmail.googleapis.com/gmail/v1/users/${userId}/messages`, messageId].filter(Boolean).join('/'),
  );
  Object.entries(params ?? {}).forEach(([key, value]) => api.searchParams.set(key, value));
  return api.toString();
};

/**
 * Parses an email string in the format "Name <email@example.com>" into separate name and email components.
 */
const parseEmailString = (emailString: string): { name?: string; email: string } | undefined => {
  const match = emailString.match(/^([^<]+?)\s*<([^>]+@[^>]+)>$/);
  if (match) {
    const [, name, email] = match;
    return {
      name: name.trim(),
      email: email.trim(),
    };
  }

  return undefined;
};

//
// Schemas
// TODO(wittjosiah): These schemas should be imported from @dxos/schema.
//

const ActorRoles = ['user', 'assistant'] as const;
const ActorRole = Schema.Literal(...ActorRoles);
type ActorRole = Schema.Schema.Type<typeof ActorRole>;

const ActorSchema = Schema.Struct({
  identityKey: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  role: Schema.optional(ActorRole),
});

const AbstractContentBlock = Schema.Struct({
  pending: Schema.optional(Schema.Boolean),
});
type AbstractContentBlock = Schema.Schema.Type<typeof AbstractContentBlock>;
const TextContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('text'),
    disposition: Schema.optional(Schema.String),
    text: Schema.String,
  }),
).pipe(Schema.mutable);
type TextContentBlock = Schema.Schema.Type<typeof TextContentBlock>;
const JsonContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('json'),
    disposition: Schema.optional(Schema.String),
    data: Schema.String,
  }),
).pipe(Schema.mutable);
type JsonContentBlock = Schema.Schema.Type<typeof JsonContentBlock>;
const Base64ImageSource = Schema.Struct({
  type: Schema.Literal('base64'),
  mediaType: Schema.String,
  data: Schema.String,
}).pipe(Schema.mutable);
const HttpImageSource = Schema.Struct({
  type: Schema.Literal('http'),
  url: Schema.String,
}).pipe(Schema.mutable);
const ImageSource = Schema.Union(Base64ImageSource, HttpImageSource);
type ImageSource = Schema.Schema.Type<typeof ImageSource>;
const ImageContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('image'),
    id: Schema.optional(Schema.String),
    source: Schema.optional(ImageSource),
  }),
).pipe(Schema.mutable);
type ImageContentBlock = Schema.Schema.Type<typeof ImageContentBlock>;
const ReferenceContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('reference'),
    reference: Schema.Any,
  }),
).pipe(Schema.mutable);
type ReferenceContentBlock = Schema.Schema.Type<typeof ReferenceContentBlock>;
const MessageContentBlock = Schema.Union(TextContentBlock, JsonContentBlock, ImageContentBlock, ReferenceContentBlock);

const MessageType = Schema.Struct({
  id: ObjectId,
  created: Schema.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: ActorSchema.annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: Schema.Array(MessageContentBlock).annotations({
    description: 'Contents of the message.',
  }),
  properties: Schema.optional(
    Schema.mutable(
      Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Message',
    version: '0.1.0',
  }),
);
type MessageType = Schema.Schema.Type<typeof MessageType>;
