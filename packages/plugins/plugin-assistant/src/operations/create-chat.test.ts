//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { TrajectoryStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { AssistantOperationHandlerSet } from '#operations';
import { AssistantOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

const makeTestLayer = (manager: CapabilityManager.CapabilityManager) =>
  AssistantTestLayer({
    operationHandlers: AssistantOperationHandlerSet,
    types: [Chat.Chat, Feed.Feed, Text.Text, ...TrajectoryStore.types],
    extraServices: Layer.succeed(Capability.Service, manager),
  });

const sharedRegistry = AtomRegistry.make();
const appManager = CapabilityManager.make({ registry: sharedRegistry });
appManager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: sharedRegistry });

// Mirrors an EDGE host, which contributes no atom registry.
const headlessManager = CapabilityManager.make({ registry: AtomRegistry.make() });

describe('CreateChat', () => {
  it.effect(
    'creates a chat with a stored feed when no atom registry is contributed',
    Effect.fnUntraced(
      function* (_) {
        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { name: 'Headless' });

        expect(Obj.instanceOf(Chat.Chat, chat)).toBe(true);
        expect(chat.name).toBe('Headless');
        const feed = yield* Database.load(chat.feed);
        expect(Obj.instanceOf(Feed.Feed, feed)).toBe(true);
      },
      Effect.provide(makeTestLayer(headlessManager)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'binds through the contributed atom registry',
    Effect.fnUntraced(
      function* (_) {
        const set = vi.spyOn(sharedRegistry, 'set');

        yield* Operation.invoke(AssistantOperation.CreateChat, {});

        expect(set).toHaveBeenCalled();
        set.mockRestore();
      },
      Effect.provide(makeTestLayer(appManager)),
      TestHelpers.provideTestContext,
    ),
  );
});
