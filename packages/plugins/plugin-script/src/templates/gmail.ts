//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { create, defineFunction, EchoObject, Filter, ObjectId, S } from 'dxos:functions';
// @ts-ignore
import {
  HttpClient,
  HttpClientRequest,
  FetchHttpClient,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.14.21&bundle=false';
// @ts-ignore
import { format, subDays } from 'https://esm.sh/date-fns@3.3.1?bundle=false';
// @ts-ignore
import { pipe, Chunk, Effect, Ref, Schedule, Stream } from 'https://esm.sh/effect@3.14.21?bundle=false';

export default defineFunction({
  inputSchema: S.Struct({
    mailboxId: S.String,
    userId: S.optional(S.String).pipe(S.withDecodingDefault(() => 'me')),
    after: S.optional(S.Union(S.Number, S.String)).pipe(
      S.withDecodingDefault(() => format(subDays(new Date(), 30), 'yyyy-MM-dd')),
    ),
    pageSize: S.optional(S.Number).pipe(S.withDecodingDefault(() => 100)),
    // TODO(wittjosiah): Remove. This is used to provide a terminal for a cron trigger.
    tick: S.optional(S.String),
  }),

  outputSchema: S.Struct({
    newMessages: S.Number,
  }),

  handler: ({ context: { space }, data: { mailboxId, userId, after, pageSize } }: any) =>
    Effect.gen(function* () {
      const { token } = yield* Effect.tryPromise({
        try: () => space.db.query(Filter.typename('dxos.org/type/AccessToken', { source: 'gmail.com' })).first(),
        catch: (e: any) => e,
      });

      // NOTE: Google API bundles size is v. large and caused runtime issues.
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
  Object.entries(params ?? {})
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => api.searchParams.set(key, value));
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
// TODO(wittjosiah): These schemas should be imported from @dxos/S.
//

const ActorRoles = ['user', 'assistant'] as const;
const ActorRole = S.Literal(...ActorRoles);
type ActorRole = S.Schema.Type<typeof ActorRole>;

const ActorSchema = S.Struct({
  identityKey: S.optional(S.String),
  email: S.optional(S.String),
  name: S.optional(S.String),
  role: S.optional(ActorRole),
});

const AbstractContentBlock = S.Struct({
  pending: S.optional(S.Boolean),
});
type AbstractContentBlock = S.Schema.Type<typeof AbstractContentBlock>;
const TextContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('text'),
    disposition: S.optional(S.String),
    text: S.String,
  }),
).pipe(S.mutable);
type TextContentBlock = S.Schema.Type<typeof TextContentBlock>;
const JsonContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('json'),
    disposition: S.optional(S.String),
    data: S.String,
  }),
).pipe(S.mutable);
type JsonContentBlock = S.Schema.Type<typeof JsonContentBlock>;
const Base64ImageSource = S.Struct({
  type: S.Literal('base64'),
  mediaType: S.String,
  data: S.String,
}).pipe(S.mutable);
const HttpImageSource = S.Struct({
  type: S.Literal('http'),
  url: S.String,
}).pipe(S.mutable);
const ImageSource = S.Union(Base64ImageSource, HttpImageSource);
type ImageSource = S.Schema.Type<typeof ImageSource>;
const ImageContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('image'),
    id: S.optional(S.String),
    source: S.optional(ImageSource),
  }),
).pipe(S.mutable);
type ImageContentBlock = S.Schema.Type<typeof ImageContentBlock>;
const ReferenceContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('reference'),
    reference: S.Any,
  }),
).pipe(S.mutable);
type ReferenceContentBlock = S.Schema.Type<typeof ReferenceContentBlock>;
const MessageContentBlock = S.Union(TextContentBlock, JsonContentBlock, ImageContentBlock, ReferenceContentBlock);

const MessageType = S.Struct({
  id: ObjectId,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: ActorSchema.annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: S.Array(MessageContentBlock).annotations({
    description: 'Contents of the message.',
  }),
  properties: S.optional(
    S.mutable(
      S.Record({ key: S.String, value: S.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
);
type MessageType = S.Schema.Type<typeof MessageType>;
