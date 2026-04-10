//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiConversation } from '@dxos/assistant';
import { Feed, Obj } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { Trace, TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientCapabilities } from '@dxos/plugin-client/types';

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
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found.');

      const feedServiceLayer = createFeedServiceLayer(space.queues);
      const runtime = yield* Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer));

      const runtimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const chatRuntime = yield* Effect.promise(() =>
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
        new AiConversation({ feed: feedTarget, runtime, registry }).use(async (conversation) =>
          updateName(chatRuntime, conversation, chat),
        ),
      );
    }),
  ),
);

export default handler;
