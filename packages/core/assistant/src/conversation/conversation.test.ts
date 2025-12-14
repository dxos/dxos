//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect } from 'vitest';

import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { ContextBinding } from './context';
import { AiConversation } from './conversation';

describe('AiConversation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  it.effect('loads blueprints on open', () =>
    Effect.gen(function* () {
      const peer = yield* Effect.promise(() => builder.createPeer({ types: [Blueprint.Blueprint, ContextBinding] }));
      const db = yield* Effect.promise(() => peer.createDatabase());
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create<ContextBinding>();

      // Create blueprint.
      const blueprint = db.add(
        Blueprint.make({
          key: 'example.com/blueprint/Test',
          name: 'Test Blueprint',
        }),
      );

      // Add blueprint to queue via binding.
      yield* Effect.promise(() =>
        queue.append([
          Obj.make(ContextBinding, {
            blueprints: {
              added: [Ref.make(blueprint)],
              removed: [],
            },
            objects: {
              added: [],
              removed: [],
            },
          }),
        ]),
      );

      const conversation = new AiConversation(queue);
      yield* Effect.promise(() => conversation.open());

      expect(conversation.context.blueprints.value).toHaveLength(1);
      expect(conversation.context.objects.value).toHaveLength(0);
    }),
  );
});
