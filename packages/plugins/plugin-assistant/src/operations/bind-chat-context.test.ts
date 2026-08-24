//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { AiContext } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { AssistantOperationHandlerSet } from '#operations';
import { AssistantCapabilities, AssistantOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

/** Objects the contributed providers bind, filled in by `seed` once a test's database exists. */
type Scratch = { applicable?: Obj.Unknown; gated?: Obj.Unknown };

/**
 * A layer carrying two providers, one unconditional and one gated to `Text` subjects, over a scratch
 * of its own. Called once per test: the layer is built before any test object exists, so the
 * providers read the scratch lazily, and sharing one across tests would share that mutable state.
 */
const setup = () => {
  const scratch: Scratch = {};
  const atomRegistry = AtomRegistry.make();
  const manager = CapabilityManager.make({ registry: atomRegistry });
  manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: atomRegistry });
  manager.contribute({
    module: 'test',
    interface: AssistantCapabilities.SubjectContext,
    implementation: {
      getBindings: () => Effect.succeed(scratch.applicable ? { objects: [Ref.make(scratch.applicable)] } : {}),
    },
  });
  manager.contribute({
    module: 'test',
    interface: AssistantCapabilities.SubjectContext,
    implementation: {
      appliesTo: Obj.instanceOf(Text.Text),
      getBindings: () => Effect.succeed(scratch.gated ? { objects: [Ref.make(scratch.gated)] } : {}),
    },
  });

  const layer = AssistantTestLayer({
    operationHandlers: AssistantOperationHandlerSet,
    types: [Chat.Chat, Feed.Feed, Text.Text, AiContext.Binding],
    extraServices: Layer.succeed(Capability.Service, manager),
  });

  return { scratch, layer };
};

describe('BindChatContext', () => {
  const merging = setup();
  it.effect(
    'merges the bindings of every provider that applies',
    Effect.fnUntraced(
      function* (_) {
        const { chat, applicable, gated } = yield* seed(merging.scratch);

        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: applicable });

        const ids = yield* boundObjectIds(chat);
        expect(ids).toContain(applicable.id);
        expect(ids).toContain(gated.id);
      },
      Effect.provide(merging.layer),
      TestHelpers.provideTestContext,
    ),
  );

  const gating = setup();
  it.effect(
    'skips a provider whose appliesTo rejects the subject',
    Effect.fnUntraced(
      function* (_) {
        const { chat, applicable, gated } = yield* seed(gating.scratch);

        // A Chat subject: the gated provider only accepts Text.
        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: chat });

        const ids = yield* boundObjectIds(chat);
        expect(ids).toContain(applicable.id);
        expect(ids).not.toContain(gated.id);
      },
      Effect.provide(gating.layer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** A chat on its own feed, plus the two objects the scratch's providers will bind. */
const seed = Effect.fnUntraced(function* (scratch: Scratch) {
  const { db } = yield* Database.Service;
  const chat = db.add(Chat.make({ feed: Ref.make(db.add(Feed.make())) }));
  const applicable = db.add(Obj.make(Text.Text, { content: 'from the unconditional provider' }));
  const gated = db.add(Obj.make(Text.Text, { content: 'from the gated provider' }));
  scratch.applicable = applicable;
  scratch.gated = gated;
  yield* Database.flush();
  return { chat, applicable, gated };
});

/**
 * Entity ids of the objects the conversation feed's binding events add up to. Ids rather than URIs:
 * a bound ref may carry the space prefix where `Obj.getURI` does not.
 */
const boundObjectIds = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed);
  const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
  return bindings.flatMap((binding) =>
    binding.objects.added.map((ref) => {
      const uri = EID.tryParse(ref.uri);
      return uri ? EID.getEntityId(uri) : ref.uri;
    }),
  );
});
