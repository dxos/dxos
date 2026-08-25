//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
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
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { AssistantOperationHandlerSet } from '#operations';
import { AssistantCapabilities, AssistantOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

const UNCONDITIONAL = 'from the unconditional provider';
const GATED = 'from the gated provider';

// `Layer.sync` rather than `succeed`: the layer is built per test, after `beforeEach` has replaced
// the manager, so it must read the binding rather than capture one.
const TestLayer = AssistantTestLayer({
  operationHandlers: AssistantOperationHandlerSet,
  types: [Chat.Chat, Feed.Feed, Text.Text, AiContext.Binding],
  extraServices: Layer.sync(Capability.Service, () => manager),
});

let manager: ReturnType<typeof CapabilityManager.make>;

describe('BindChatContext', () => {
  beforeEach(() => {
    const atomRegistry = AtomRegistry.make();
    manager = CapabilityManager.make({ registry: atomRegistry });
    manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: atomRegistry });
    manager.contribute({
      module: 'test',
      interface: AssistantCapabilities.SubjectContext,
      implementation: marker(UNCONDITIONAL),
    });
    manager.contribute({
      module: 'test',
      interface: AssistantCapabilities.SubjectContext,
      implementation: marker(GATED, Obj.instanceOf(Text.Text)),
    });
  });

  it.effect(
    'merges the bindings of every provider that applies',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat();
        const subject = yield* makeText('subject');

        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject });

        expect(yield* boundText(chat)).toEqual(expect.arrayContaining([UNCONDITIONAL, GATED]));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips a provider whose appliesTo rejects the subject',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat();

        // A Chat subject: the gated provider only accepts Text.
        yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: chat });

        const bound = yield* boundText(chat);
        expect(bound).toContain(UNCONDITIONAL);
        expect(bound).not.toContain(GATED);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** A provider that binds a marker of its own making, so a test can name it by content. */
function marker(content: string, appliesTo?: (subject: Obj.Unknown) => boolean): AssistantCapabilities.SubjectContext {
  return {
    appliesTo,
    getBindings: Effect.fnUntraced(function* () {
      return { objects: [Ref.make(yield* makeText(content))] };
    }),
  };
}

const makeText = Effect.fnUntraced(function* (content: string) {
  const { db } = yield* Database.Service;
  return db.add(Obj.make(Text.Text, { content }));
});

const makeChat = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const chat = db.add(Chat.make({ feed: Ref.make(db.add(Feed.make())) }));
  yield* Database.flush();
  return chat;
});

/** Content of the text objects the feed's binding events add up to. */
const boundText = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const feed = yield* Database.load(chat.feed);
  const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
  const objects = yield* Effect.forEach(
    bindings.flatMap((binding) => binding.objects.added),
    (ref) => Database.load(ref),
  );
  return objects.filter(Obj.instanceOf(Text.Text)).map(({ content }) => content);
});
