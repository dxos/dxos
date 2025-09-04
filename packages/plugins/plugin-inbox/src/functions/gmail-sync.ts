//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient, HttpClientRequest } from '@effect/platform';
import { type HttpClientError } from '@effect/platform/HttpClientError';
import { format, subDays } from 'date-fns';
import { Chunk, Console, Effect, Ref, Schedule, Schema, Stream, pipe } from 'effect';
import { type TimeoutException } from 'effect/Cause';

import { ArtifactId } from '@dxos/assistant';
import { Filter, Obj, Type } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Mailbox } from '../types';

export default defineFunction({
  name: 'dxos.org/function/inbox/gmail-sync',
  description: 'Sync emails from Gmail to the mailbox.',
  inputSchema: Schema.Struct({
    mailboxId: ArtifactId,
    userId: Schema.optional(Schema.String),
    after: Schema.optional(Schema.Union(Schema.Number, Schema.String)),
    pageSize: Schema.optional(Schema.Number),
  }),
  outputSchema: Schema.Struct({
    newMessages: Schema.Number,
  }),
  handler: ({
    data: { mailboxId, userId = 'me', after = format(subDays(new Date(), 30), 'yyyy-MM-dd'), pageSize = 100 },
  }) =>
    Effect.gen(function* () {
      yield* Console.log('running gmail sync', { mailboxId, userId, after, pageSize });

      const {
        objects: [{ token }],
      } = yield* DatabaseService.runQuery(Filter.type(DataType.AccessToken, { source: 'gmail.com' }));
      yield* Console.log('found token', { token });

      // TODO(wittjosiah): Can't use `HttpClient.execute` directly because it results in CORS errors when traced.
      //   Is this an issue on Google's side or is it a bug in `@effect/platform`?
      const httpClient = yield* HttpClient.HttpClient;
      const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

      // NOTE: Google API bundles size is v. large and caused runtime issues.
      const makeRequest = (url: string) =>
        HttpClientRequest.get(url).pipe(
          HttpClientRequest.setHeader('authorization', `Bearer ${token}`),
          HttpClientRequest.setHeader('accept', 'application/json'),
          httpClientWithTracerDisabled.execute,
          Effect.flatMap((res) => res.json),
          Effect.timeout('1 second'),
          Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
          Effect.scoped,
        );

      // TODO(wittjosiah): Add schema to parse response.
      const listMessages = (userId: string, q: string, pageSize: number, pageToken: string | null) =>
        makeRequest(getUrl(userId, undefined, { q, pageSize, pageToken })) as Effect.Effect<
          { messages: { id: string; threadId: string }[]; nextPageToken: string },
          HttpClientError | TimeoutException,
          HttpClient.HttpClient
        >;

      // TODO(wittjosiah): Add schema to parse response.
      const getMessage = (userId: string, messageId: string) =>
        makeRequest(getUrl(userId, messageId)) as Effect.Effect<
          {
            id: string;
            threadId: string;
            internalDate: string;
            payload: {
              headers: { name: string; value: string }[];
              body?: { data: string };
              parts?: { mimeType: string; body: { data: string } }[];
            };
          },
          HttpClientError | TimeoutException,
          HttpClient.HttpClient
        >;

      const mailbox = yield* DatabaseService.resolve(ArtifactId.toDXN(mailboxId), Mailbox.Mailbox);
      const queue = yield* QueueService.getQueue<DataType.Message>(mailbox.queue.dxn);
      const newMessages = yield* Ref.make<DataType.Message[]>([]);
      const nextPage = yield* Ref.make<string | null>(null);

      do {
        const last = queue.objects.at(-1);
        const q = last
          ? `in:inbox after:${Math.floor(new Date(last.created).getTime() / 1000)}`
          : `in:inbox after:${after}`;
        const pageToken = yield* Ref.get(nextPage);
        yield* Console.log('listing messages', { q, pageToken });
        const { messages, nextPageToken } = yield* listMessages(userId, q, pageSize, pageToken);
        yield* Ref.update(nextPage, () => nextPageToken);
        for (const message of messages) {
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
            continue;
          }
          const subject = messageDetails.payload.headers.find((h) => h.name === 'Subject')?.value;
          const object = Obj.make(DataType.Message, {
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
          // TODO(wittjosiah): Set foreignId in object meta.
          yield* Ref.update(newMessages, (n) => [object, ...n]);
        }
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
