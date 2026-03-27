//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiConversation } from '@dxos/assistant';
import { type Queue } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { type Message } from '@dxos/types';

import { type AiChatServices, updateName } from '../processor';
import { UpdateChatName } from './definitions';

const handler: Operation.WithHandler<typeof UpdateChatName> = UpdateChatName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ chat }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const db = Obj.getDatabase(chat);
      const queue = chat.queue.target as Queue<Message.Message>;
      if (!db || !queue) {
        return;
      }

      const runtimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const runtime = yield* Effect.promise(() =>
        runtimeResolver
          .getRuntime(db.spaceId)
          .runPromise(Effect.runtime<AiChatServices>().pipe(Effect.provide(TracingService.layerNoop))),
      );

      yield* Effect.promise(() =>
        new AiConversation({ queue, registry }).use(async (conversation) => updateName(runtime, conversation, chat)),
      );
    }),
  ),
);

export default handler;
