//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { setupPluginManager } from '@dxos/app-framework/testing';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import { type AgentOption } from '../../util/agent-options.ts';
import { choosePlacement, usePlacement } from './ChatAgentPicker.tsx';

describe('usePlacement', () => {
  const TestLayer = TestDatabaseLayer({ types: [Chat.Chat, Feed.Feed, Text.Text] });
  const pluginManager = setupPluginManager();
  const wrapper = ({ children }: PropsWithChildren) => (
    <PluginManagerProvider.Root value={pluginManager}>{children}</PluginManagerProvider.Root>
  );

  test('picking an agent that runs only on this device keeps the chat local', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const local: AgentOption = {
        value: 'local-agent',
        label: 'Local agent',
        icon: 'ph--desktop--regular',
        disabled: false,
        placements: [{ location: 'local', harness: 'local-agent', available: true }],
        ownModel: true,
      };

      const { result } = renderHook(() => usePlacement(chat, local, 'local-agent'), { wrapper });
      result.current.select(local, local.placements[0]);
      expect(chat.remote).toBe(false);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('picking an agent that runs only on EDGE keeps the chat local', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const edge: AgentOption = {
        value: 'edge-agent',
        label: 'EDGE agent',
        icon: 'ph--cloud--regular',
        disabled: false,
        placements: [{ location: 'edge', harness: 'edge-agent', available: true }],
        ownModel: true,
      };

      const { result } = renderHook(() => usePlacement(chat, edge, 'edge-agent'), { wrapper });
      result.current.select(edge, edge.placements[0]);
      expect(chat.remote).toBe(false);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('switching to an agent that runs in several places keeps EDGE', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const coder: AgentOption = {
        value: 'coder',
        label: 'Coder',
        icon: 'ph--code--regular',
        disabled: false,
        placements: [
          { location: 'local', harness: 'coder', available: true },
          { location: 'edge', harness: 'coder-edge', available: true },
        ],
        ownModel: true,
      };
      const assistant: AgentOption = {
        value: 'assistant',
        label: 'Assistant',
        icon: 'ph--sparkle--regular',
        disabled: false,
        placements: [
          { location: 'local', harness: 'assistant', available: true },
          { location: 'edge', harness: 'assistant', available: true },
        ],
        ownModel: false,
      };

      const { result } = renderHook(() => usePlacement(chat, coder, 'coder-edge'), { wrapper });
      result.current.select(assistant, assistant.placements[1]);
      expect(chat.remote).toBe(true);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});

describe('choosePlacement', () => {
  const assistant: AgentOption = {
    value: 'assistant',
    label: 'Assistant',
    icon: 'ph--sparkle--regular',
    disabled: false,
    placements: [
      { location: 'local', harness: 'assistant', available: true },
      { location: 'edge', harness: 'assistant', available: true },
    ],
    ownModel: false,
  };

  test('keeps the place the chat runs', () => {
    expect(choosePlacement(assistant, assistant.placements, 'edge', undefined)).toBe(assistant.placements[1]);
  });

  test('keeps an agent on a local model on this device', () => {
    const model = { id: 'llama', label: 'Llama', local: true };
    expect(choosePlacement(assistant, assistant.placements, 'edge', model)).toBe(assistant.placements[0]);
  });
});
