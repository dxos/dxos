//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { createStatic, EchoObject, defineFunction, DXN, Filter, ObjectId, S } from 'dxos:functions';
import {
  FetchHttpClient,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.13.3';
// @ts-ignore
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'https://esm.sh/dfx@0.113.0?deps=effect@3.13.3';
// @ts-ignore
import { Effect, Config, Redacted } from 'https://esm.sh/effect@3.13.3';

const MessageSchema = S.Struct({
  id: S.String,
  foreignId: S.Number,
  from: S.String,
  created: S.String,
  content: S.String,
}).pipe(EchoObject('example.com/type/Message', '0.1.0'));

export default defineFunction({
  inputSchema: S.Struct({
    // TODO(wittjosiah): Remove. This is used to provide a terminal for a cron trigger.
    tick: S.optional(S.String),
    channelId: S.String,
    pageSize: S.optional(S.Number),
    queueId: S.String,
  }),

  outputSchema: S.Struct({
    newMessages: S.Number,
  }),

  handler: ({
    event: {
      data: { channelId, queueId, pageSize = 5 },
    },
    context: { space },
  }: any) =>
    Effect.gen(function* () {
      const { token } = yield* Effect.tryPromise(() =>
        space.db.query(Filter.typename('dxos.org/type/AccessToken', { source: 'discord.com' })).first(),
      );

      const enqueueMessages = Effect.gen(function* () {
        const rest = yield* DiscordREST;
        const { objects } = yield* Effect.tryPromise(() => space.queues.queryQueue(DXN.parse(queueId)));

        let newMessages = 0;
        let lastMessage = objects.at(-1);
        while (true) {
          // NOTE: If `after` is specified, the specified message is included in the results.
          const messages = yield* rest
            .getChannelMessages(channelId, { after: lastMessage?.foreignId, limit: pageSize })
            .pipe((res: any) => res.json);
          if (messages.length === 1) {
            break;
          }
          const queueMessages = messages
            .map((message: any) =>
              createStatic(MessageSchema, {
                id: ObjectId.random(),
                foreignId: parseInt(message.id),
                from: message.author.username,
                created: message.timestamp,
                content: message.content,
              }),
            )
            .slice(lastMessage ? 1 : 0)
            .toReversed();
          yield* Effect.tryPromise(() => space.queues.insertIntoQueue(DXN.parse(queueId), queueMessages));
          newMessages += queueMessages.length;
          lastMessage = queueMessages.at(-1);
        }

        return { newMessages };
      }).pipe(
        Effect.provide(DiscordRESTMemoryLive),
        Effect.provide(
          DiscordConfig.layerConfig({
            token: Config.succeed(Redacted.make(token)),
          }),
        ),
        Effect.provide(FetchHttpClient.layer),
      );

      return yield* enqueueMessages;
    }),
});
