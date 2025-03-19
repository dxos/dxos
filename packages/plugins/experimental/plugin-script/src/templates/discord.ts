//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { createStatic, EchoObject, defineFunction, DXN, Filter, ObjectId, S } from 'dxos:functions';
import {
  FetchHttpClient,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.12.12';
// @ts-ignore
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'https://esm.sh/dfx@0.113.0?deps=effect@3.12.12';
// @ts-ignore
import { Effect, Config, Redacted, Ref } from 'https://esm.sh/effect@3.12.12';

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
  }: any) =>
    Effect.gen(function* () {
      const { token } = yield* Effect.tryPromise(() =>
        space.db.query(Filter.typename('dxos.org/type/AccessToken', { source: 'discord.com' })).first(),
      );
      const { objects } = yield* Effect.tryPromise(() => space.queues.queryQueue(DXN.parse(queueId)));
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
            yield* Effect.tryPromise(() => space.queues.insertIntoQueue(DXN.parse(queueId), queueMessages));
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
