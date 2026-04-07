//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiConversation } from '@dxos/assistant';
import { Feed, Obj } from '@dxos/echo';
import { Trace, TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Message } from '@dxos/types';

import { type AiChatServices, updateName } from '../processor';
import { UpdateChatName } from './definitions';

const handler: Operation.WithHandler<typeof UpdateChatName> = UpdateChatName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ chat }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const db = Obj.getDatabase(chat);
      const feedTarget = chat.feed.target;
      if (!db || !feedTarget) {
        return;
      }
      const queueDxn = Feed.getQueueDxn(feedTarget);
      invariant(queueDxn, 'Feed queue DXN not found.');
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found.');
      const queue = space.queues.get<Message.Message>(queueDxn);

      const runtimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const runtime = yield* Effect.promise(() =>
        runtimeResolver
          .getRuntime(db.spaceId)
          .runPromise(
            Effect.runtime<AiChatServices>().pipe(
              Effect.provide(TracingService.layerNoop),
              Effect.provide(Trace.writerLayerNoop),
            ),
          ),
      );

      yield* Effect.promise(() =>
        new AiConversation({ queue, registry }).use(async (conversation) => updateName(runtime, conversation, chat)),
      );
    }),
  ),
);

export default handler;
