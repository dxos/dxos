//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient, HttpClientRequest } from '@effect/platform';
import { format, subDays } from 'date-fns';
import { Array, Chunk, Console, Effect, Ref, Schedule, Schema, Stream, pipe } from 'effect';
import { isNotNullable } from 'effect/Predicate';

import { Obj, Type, DXN } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction, withAuthorization } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Mailbox } from '../types';

export default defineFunction({
  name: 'dxos.org/function/inbox/gmail-sync',
  description: 'Sync emails from Gmail to the mailbox.',
  inputSchema: Schema.Struct({
    mailboxId: Schema.String.annotations({
      description: 'The DXN ID of the mailbox object.',
    }),
    userId: Schema.optional(Schema.String),
    after: Schema.optional(Schema.Union(Schema.Number, Schema.String)),
    pageSize: Schema.optional(Schema.Number),
  }),
  outputSchema: Schema.Struct({
    newMessages: Schema.Number,
  }),
  handler: ({
    // TODO(wittjosiah): Schema-based defaults are not yet supported.
    data: { mailboxId, userId = 'me', after = format(subDays(new Date(), 30), 'yyyy-MM-dd'), pageSize = 100 },
  }) =>
    Effect.gen(function* () {
      yield* Console.log('running gmail sync', { mailboxId, userId, after, pageSize });

      const mailbox = yield* DatabaseService.resolve(DXN.parse(mailboxId), Mailbox.Mailbox);
      const queue = yield* QueueService.getQueue<DataType.Message>(mailbox.queue.dxn);
      const newMessages = yield* Ref.make<DataType.Message[]>([]);
      const nextPage = yield* Ref.make<string | undefined>(undefined);

      do {
        const objects = yield* Effect.tryPromise(() => queue.queryObjects());
        const last = objects.at(-1);
        const q = last
          ? `in:inbox after:${Math.floor(new Date(last.created).getTime() / 1000)}`
          : `in:inbox after:${after}`;
        const pageToken = yield* Ref.get(nextPage);
        yield* Console.log('listing messages', { q, pageToken });

        const { messages, nextPageToken } = yield* listMessages(userId, q, pageSize, pageToken);
        yield* Ref.update(nextPage, () => nextPageToken);

        const messageObjects = yield* pipe(
          messages,
          Array.map(messageToObject(userId, last)),
          Effect.all,
          Effect.map((objects) => Array.filter(objects, isNotNullable)),
          Effect.map((objects) => Array.reverse(objects)),
        );

        // TODO(wittjosiah): Set foreignId in object meta.
        yield* Ref.update(newMessages, (n) => [...messageObjects, ...n]);
      } while (yield* Ref.get(nextPage));

      const queueMessages = yield* Ref.get(newMessages);
      if (queueMessages.length > 0) {
        yield* pipe(
          queueMessages,
          Stream.fromIterable,
          Stream.grouped(10),
          Stream.flatMap((batch) => Effect.tryPromise(() => queue.append(Chunk.toArray(batch)))),
          Stream.runDrain,
        );
      }

      yield* Console.log('gmail sync complete', { newMessages: queueMessages.length });

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

// NOTE: Google API bundles size is v. large and caused runtime issues.
const makeRequest = Effect.fnUntraced(function* (url: string) {
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.map(withAuthorization({ service: 'gmail.com' }, 'Bearer')),
  );
  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //   Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //   https://github.com/Effect-TS/effect/issues/4568
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  return yield* HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    Effect.flatMap((res) => res.json),
    Effect.timeout('1 second'),
    Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
  );
});

/**
 * Fetches a list of Gmail messages.
 */
const listMessages = Effect.fn(function* (userId: string, q: string, pageSize: number, pageToken: string | undefined) {
  return yield* makeRequest(getUrl(userId, undefined, { q, pageSize, pageToken })).pipe(
    Effect.flatMap(Schema.decodeUnknown(ListMessagesResponse)),
  );
});

/**
 * Fetches the details of a Gmail message.
 */
const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  return yield* makeRequest(getUrl(userId, messageId)).pipe(Effect.flatMap(Schema.decodeUnknown(MessageDetails)));
});

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

/**
 * Transforms a Gmail message to a ECHO message object.
 */
const messageToObject = (userId: string, last?: DataType.Message) =>
  Effect.fn(function* (message: Message) {
    const messageDetails = yield* getMessage(userId, message.id);
    const created = new Date(parseInt(messageDetails.internalDate)).toISOString();
    const from = messageDetails.payload.headers.find((h) => h.name === 'From');
    const sender = from && parseEmailString(from.value);
    // TODO(wittjosiah): Improve parsing of email contents.
    const content =
      messageDetails.payload.body?.data ??
      messageDetails.payload.parts?.find((p) => p.mimeType === 'text/plain')?.body.data;
    // Skip the message if content or sender is missing.
    // Skip the message if it's the same as the last message.
    // TODO(wittjosiah): This comparison should be done via foreignId probably.
    if (!content || !sender || created === last?.created) {
      return undefined;
    }
    const subject = messageDetails.payload.headers.find((h) => h.name === 'Subject')?.value;
    return Obj.make(DataType.Message, {
      id: Type.ObjectId.random(),
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
  });

const Message = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
});
type Message = Schema.Schema.Type<typeof Message>;

const ListMessagesResponse = Schema.Struct({
  messages: Schema.Array(Message),
  nextPageToken: Schema.optional(Schema.String),
});

const MessageDetails = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  internalDate: Schema.String,
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
type MessageDetails = Schema.Schema.Type<typeof MessageDetails>;
