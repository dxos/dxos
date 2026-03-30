//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiConversation } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { DXN } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { QueueService } from '@dxos/functions';
import { type Message } from '@dxos/types';

import { AiChatProcessor } from './processor';

describe('Chat processor', () => {
  it.scoped(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const queue = yield* QueueService.createQueue<Message.Message>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue }));
        const runtime = yield* Effect.runtime<any>();
        const managedRuntime = ManagedRuntime.make(
          Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
        );
        const processor = new AiChatProcessor(conversation, managedRuntime as any, DXN.parse(queue.dxn.toString()));
        expect(processor).toBeDefined();
        expect(processor.active).toBeDefined();
      },
      Effect.provide(AssistantTestLayer({ tracing: 'noop' })),
      TestHelpers.provideTestContext,
    ),
  );
});
