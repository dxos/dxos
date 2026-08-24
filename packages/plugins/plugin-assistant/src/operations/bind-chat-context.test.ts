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

// The providers are contributed when the layer is built, before any test object exists; they read the
// objects a test puts here so the contribution can be a plain closure.
const scratch: { applicable?: Obj.Unknown; gated?: Obj.Unknown } = {};

const bindObject = (
  get: () => Obj.Unknown | undefined,
  appliesTo?: (subject: Obj.Unknown) => boolean,
): AssistantCapabilities.SubjectContext => ({
  appliesTo,
  getBindings: () => {
    const object = get();
    return Effect.succeed(object ? { objects: [Ref.make(object)] } : {});
  },
});

const TestLayer = (() => {
  const atomRegistry = AtomRegistry.make();
  const manager = CapabilityManager.make({ registry: atomRegistry });
  manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: atomRegistry });
  // An unconditional provider and one gated to `Text` subjects only.
  manager.contribute({
    module: 'test',
    interface: AssistantCapabilities.SubjectContext,
    implementation: bindObject(() => scratch.applicable),
  });
  manager.contribute({
    module: 'test',
    interface: AssistantCapabilities.SubjectContext,
    implementation: bindObject(
      () => scratch.gated,
      (subject) => Obj.instanceOf(Text.Text, subject),
    ),
  });

  return AssistantTestLayer({
    operationHandlers: AssistantOperationHandlerSet,
    types: [Chat.Chat, Feed.Feed, Text.Text, AiContext.Binding],
    extraServices: Layer.succeed(Capability.Service, manager),
  });
})();

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

const makeChat = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const feed = db.add(Feed.make());
  const chat = db.add(Chat.make({ feed: Ref.make(feed) }));
  yield* Database.flush();
  return chat;
});

describe('BindChatContext', () => {
  it.effect(
    'merges the bindings of every provider that applies',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const chat = yield* makeChat();
        const subject = db.add(Obj.make(Text.Text, { content: 'subject' }));
        scratch.applicable = db.add(Obj.make(Text.Text, { content: 'from the default provider' }));
        scratch.gated = db.add(Obj.make(Text.Text, { content: 'from the gated provider' }));
        yield* Database.flush();

        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject });

        const ids = yield* boundObjectIds(chat);
        expect(ids).toContain(scratch.applicable.id);
        expect(ids).toContain(scratch.gated.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips a provider whose appliesTo rejects the subject',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const chat = yield* makeChat();
        // A Chat subject: the gated provider only accepts Text.
        const subject = db.add(Chat.make({ feed: Ref.make(db.add(Feed.make())) }));
        scratch.applicable = db.add(Obj.make(Text.Text, { content: 'from the default provider' }));
        scratch.gated = db.add(Obj.make(Text.Text, { content: 'from the gated provider' }));
        yield* Database.flush();

        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject });

        const ids = yield* boundObjectIds(chat);
        expect(ids).toContain(scratch.applicable.id);
        expect(ids).not.toContain(scratch.gated.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
