//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { EchoObject, Filter, ObjectId, S, create, defineFunction } from 'dxos:functions';
// @ts-ignore
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.89.0?deps=effect@3.17.0&bundle=false';
// @ts-ignore
import { format, subDays } from 'https://esm.sh/date-fns@3.3.1?bundle=false';
// @ts-ignore
import * as Chunk from 'https://esm.sh/effect@3.17.0/Chunk?bundle=false';
// @ts-ignore
import * as Effect from 'https://esm.sh/effect@3.17.0/Effect?bundle=false';
// @ts-ignore
import * as Function from 'https://esm.sh/effect@3.17.0/Function?bundle=false';
// @ts-ignore
import * as Ref from 'https://esm.sh/effect@3.17.0/Ref?bundle=false';
// @ts-ignore
import * as Schedule from 'https://esm.sh/effect@3.17.0/Schedule?bundle=false';
// @ts-ignore
import * as Stream from 'https://esm.sh/effect@3.17.0/Stream?bundle=false';

export default defineFunction({
  key: 'dxos.org/script/gmail',
  name: 'Gmail',
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
        Function.pipe(
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
          const sender = from && parseFromHeader(from.value);
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
                _tag: 'text',
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
        yield* Function.pipe(
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
const parseFromHeader = (value: string): { name?: string; email: string } | undefined => {
  const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;
  const removeOuterQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '');
  const match = value.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: removeOuterQuotes(name.trim()),
      email: email.trim(),
    };
  }
};

//
// Schemas
// TODO(wittjosiah): These schemas should be imported from @dxos/schema.
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

const Base = S.Struct({
  pending: S.optional(S.Boolean),
});
type Base = S.Schema.Type<typeof Base>;
const Text = S.TaggedStruct('text', {
  mimeType: S.optional(S.String),
  text: S.String,
  ...Base.fields,
}).pipe(S.mutable);
interface Text extends S.Schema.Type<typeof Text> {}

const MessageType = S.Struct({
  id: ObjectId,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: ActorSchema.annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: S.Array(Text).annotations({
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
