//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { format, subDays } from 'date-fns';
import * as Array from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Predicate from 'effect/Predicate';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { ArtifactId } from '@dxos/assistant';
import { DXN } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { type Message } from '@dxos/types';

// TODO(burdon): Importing from types/index.ts pulls in @dxos/client dependencies due to SpaceSchema.
import * as Mailbox from '../../../types/Mailbox';
import { GoogleMail } from '../../apis';

import { mapMessage } from './mapper';

export default defineFunction({
  key: 'dxos.org/function/inbox/google-mail-sync',
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

      const mailbox = yield* DatabaseService.resolve(DXN.parse(mailboxId), Mailbox.Mailbox);

      // TODO(wittjosiah): Consider syncing labels to space.
      // Sync labels.
      // const { labels } = yield* listLabels(userId);
      // labels.forEach((label) => {
      //   (mailbox.tags ??= {})[label.id] = { label: label.name };
      // });

      const queue = yield* QueueService.getQueue<Message.Message>(mailbox.queue.dxn);
      const newMessages = yield* Ref.make<Message.Message[]>([]);
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
        const { messages, nextPageToken } = yield* GoogleMail.listMessages(userId, q, pageSize, pageToken);
        yield* Ref.update(nextPage, () => nextPageToken);

        // Process messges.
        const messageObjects = yield* Function.pipe(
          messages,
          Array.map((message) =>
            Function.pipe(
              // Retrieve details.
              GoogleMail.getMessage(userId, message.id),
              Effect.flatMap(mapMessage(last)),
            ),
          ),
          Effect.all,
          Effect.map((objects) => Array.filter(objects, Predicate.isNotNullable)),
          Effect.map((objects) => Array.reverse(objects)),
        );

        // TODO(wittjosiah): Set foreignId in object meta.
        yield* Ref.update(newMessages, (messages) => [...messageObjects, ...messages]);
      } while (yield* Ref.get(nextPage));

      // Append to queue.
      const queueMessages = yield* Ref.get(newMessages);
      if (queueMessages.length > 0) {
        yield* Function.pipe(
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
