//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { format, subDays } from 'date-fns';
import * as Array from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as pipe from 'effect/pipe';
import { isNotNullable } from 'effect/Predicate';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { ArtifactId } from '@dxos/assistant';
import { DXN } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { type DataType } from '@dxos/schema';

// TODO(burdon): Importing from types/index.ts pulls in @dxos/client dependencies.
import { Mailbox } from '../../types/mailbox';

import { getMessage, listLabels, listMessages, messageToObject } from './api';

export default defineFunction({
  key: 'dxos.org/function/inbox/gmail-sync',
  name: 'Sync Gmail',
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
    // TODO(wittjosiah): Schema-based defaults are not yet supported.
    data: { mailboxId, userId = 'me', after = format(subDays(new Date(), 30), 'yyyy-MM-dd'), pageSize = 100 },
  }) =>
    Effect.gen(function* () {
      yield* Console.log('syncing gmail', { mailboxId, userId, after, pageSize });

      const mailbox = yield* DatabaseService.resolve(DXN.parse(mailboxId), Mailbox);

      // Sync labels.
      const { labels } = yield* listLabels(userId);
      labels.forEach((label) => {
        (mailbox.tags ??= {})[label.id] = { label: label.name };
      });

      const queue = yield* QueueService.getQueue<DataType.Message>(mailbox.queue.dxn);
      const newMessages = yield* Ref.make<DataType.Message[]>([]);
      const nextPage = yield* Ref.make<string | undefined>(undefined);

      do {
        // Sync messages.
        // TODO(burdon): Query from Oldest to Newest (due to queue order).
        const objects = yield* Effect.tryPromise(() => queue.queryObjects());
        const last = objects.at(-1);
        const q = last
          ? `in:inbox after:${Math.floor(new Date(last.created).getTime() / 1_000)}`
          : `in:inbox after:${after}`;
        const pageToken = yield* Ref.get(nextPage);
        yield* Console.log('requesting messages', { q, pageToken });
        const { messages, nextPageToken } = yield* listMessages(userId, q, pageSize, pageToken);
        yield* Ref.update(nextPage, () => nextPageToken);

        // Process messges.
        const messageObjects = yield* pipe(
          messages,
          Array.map((message) =>
            pipe(
              // Retrieve details.
              getMessage(userId, message.id),
              Effect.flatMap(messageToObject(last)),
            ),
          ),
          Effect.all,
          Effect.map((objects) => Array.filter(objects, isNotNullable)),
          Effect.map((objects) => Array.reverse(objects)),
        );

        // TODO(wittjosiah): Set foreignId in object meta.
        yield* Ref.update(newMessages, (messages) => [...messageObjects, ...messages]);
      } while (yield* Ref.get(nextPage));

      // Append to queue.
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

      yield* Console.log('sync complete', { newMessages: queueMessages.length });
      return {
        newMessages: queueMessages.length,
      };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
