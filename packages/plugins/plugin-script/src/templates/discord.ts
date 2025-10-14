//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { DXN, EchoObject, Filter, ObjectId, S, create, defineFunction } from 'dxos:functions';
// @ts-ignore
import { FetchHttpClient } from 'https://esm.sh/@effect/platform@0.89.0?deps=effect@3.17.0&bundle=false';
import {
  DiscordConfig,
  DiscordREST,
  DiscordRESTMemoryLive,
  // @ts-ignore
} from 'https://esm.sh/dfx@0.113.0?deps=effect@3.17.0&bundle=false';
// @ts-ignore
import * as Config from 'https://esm.sh/effect@3.17.0/Config?bundle=false';
// @ts-ignore
import * as Effect from 'https://esm.sh/effect@3.17.0/Effect?bundle=false';
// @ts-ignore
import * as Redacted from 'https://esm.sh/effect@3.17.0/Redacted?bundle=false';
// @ts-ignore
import * as Ref from 'https://esm.sh/effect@3.17.0/Ref?bundle=false';

const MessageSchema = S.Struct({
  id: ObjectId,
  foreignId: S.Any, // bigint?
  from: S.String,
  created: S.String,
  content: S.String,
}).pipe(
  EchoObject({
    typename: 'example.com/type/Message',
    version: '0.1.0',
  }),
);

const DEFAULT_AFTER = 1704067200; // 2024-01-01

const generateSnowflake = (unixTimestamp: number): bigint => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return (BigInt(unixTimestamp * 1000) - discordEpoch) << 22n;
};

export default defineFunction({
  key: 'dxos.org/script/discord',
  name: 'Discord',
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

  handler: ({ data: { channelId, queueId, after = DEFAULT_AFTER, pageSize = 5 }, context: { space } }: any) =>
    Effect.gen(function* () {
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
      const lastMessage = yield* Ref.make(objects.at(-1));

      const enqueueMessages = Effect.gen(function* () {
        const rest = yield* DiscordREST;

        while (true) {
          const last = yield* Ref.get(lastMessage);
          const options = {
            after: backfill && !last ? `${generateSnowflake(after)}` : last?.foreignId,
            limit: pageSize,
          };
          const messages = yield* rest.getChannelMessages(channelId, options).pipe((res: any) => res.json);
          const queueMessages = messages
            .map((message: any) =>
              create(MessageSchema, {
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
            yield* Ref.update(newMessages, (n: any) => n + queueMessages.length);
            yield* Ref.update(lastMessage, (m: any) => queueMessages.at(-1));
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
