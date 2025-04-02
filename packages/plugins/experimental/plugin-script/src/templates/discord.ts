//
// Copyright 2025 DXOS.org
//

/* @version
{
  "@dxos/client": "0.7.5-main.b19bfc8",
  "@dxos/echo-schema": "0.7.5-main.b19bfc8",
  "@dxos/functions": "0.7.5-main.b19bfc8",
  "@dxos/invariant": "0.7.5-main.b19bfc8",
  "@dxos/keys": "0.7.5-main.b19bfc8"
}
*/

import { FetchHttpClient } from '@effect/platform';
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import { Effect, Config, Redacted, Ref, Schema as S } from 'effect';

import { Filter } from '@dxos/client/echo';
import { createStatic, EchoObject, ObjectId } from '@dxos/echo-schema';
import { defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

const MessageSchema = S.Struct({
  id: S.String,
  foreignId: S.Any, // bigint?
  from: S.String,
  created: S.String,
  content: S.String,
}).pipe(EchoObject('example.com/type/Message', '0.1.0'));

const DEFAULT_AFTER = 1704067200; // 2024-01-01

const generateSnowflake = (unixTimestamp: number): bigint => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return (BigInt(unixTimestamp * 1000) - discordEpoch) << 22n;
};

export default defineFunction({
  inputSchema: S.Struct({
    // TODO(wittjosiah): Remove. This is used to provide a terminal for a cron trigger.
    tick: S.optional(S.String),
    channelId: S.String,
    after: S.optional(S.Number),
    pageSize: S.optional(S.Number),
    queueId: S.String,
  }),

  outputSchema: S.Struct({
    newMessages: S.Number,
  }),

  handler: ({
    event: {
      data: { channelId, queueId, after = DEFAULT_AFTER, pageSize = 5 },
    },
    context: { space },
  }) =>
    Effect.gen(function* () {
      invariant(space, 'Space is required');
      const { token } = yield* Effect.tryPromise({
        try: () => space.db.query(Filter.typename('dxos.org/type/AccessToken', { source: 'discord.com' })).first(),
        catch: (e: any) => e,
      });
      const { objects } = yield* Effect.tryPromise({
        try: () => space.queues.queryQueue(DXN.parse(queueId)),
        catch: (e: any) => e,
      });
      const backfill = objects.length === 0;
      const newMessages = yield* Ref.make(0);
      const lastMessage = yield* Ref.make(objects.at(-1) as S.Schema.Type<typeof MessageSchema>);

      const enqueueMessages = Effect.gen(function* () {
        const rest = yield* DiscordREST;

        while (true) {
          const last = yield* Ref.get(lastMessage);
          const options = {
            after: backfill && !last ? `${generateSnowflake(after)}` : last?.foreignId,
            limit: pageSize,
          };
          const messages = yield* rest.getChannelMessages(channelId, options).pipe((res) => res.json);
          const queueMessages = messages
            .map((message) =>
              createStatic(MessageSchema, {
                id: ObjectId.random(),
                foreignId: message.id,
                from: message.author.username,
                created: message.timestamp,
                content: message.content,
              }),
            )
            .toReversed();
          if (queueMessages.length > 0) {
            yield* Effect.tryPromise({
              try: () => space.queues.insertIntoQueue(DXN.parse(queueId), queueMessages),
              catch: (e: any) => e,
            });
            yield* Ref.update(newMessages, (n) => n + queueMessages.length);
            yield* Ref.update(lastMessage, (m) => queueMessages.at(-1)!);
          }
          if (messages.length < pageSize) {
            break;
          }
        }
      }).pipe(
        Effect.provide(DiscordRESTMemoryLive),
        Effect.provide(
          DiscordConfig.layerConfig({
            token: Config.succeed(Redacted.make(token)),
          }),
        ),
        Effect.provide(FetchHttpClient.layer),
      );

      yield* enqueueMessages;
      return { newMessages: yield* Ref.get(newMessages) };
    }),
});
