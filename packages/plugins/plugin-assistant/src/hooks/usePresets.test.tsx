//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { renderHook, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { Provider } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { setupPluginManager } from '@dxos/app-framework/testing';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Message, Task } from '@dxos/types';

import { type Assistant, AssistantCapabilities, Ollama } from '#types';

import { presetsForProvider } from '../chat-model/index.ts';
import { usePresets } from './usePresets.ts';

describe('usePresets', () => {
  const TestLayer = TestDatabaseLayer({ types: [Chat.Chat, Feed.Feed, Text.Text, Message.Message, Task.Task] });

  // No plugins registered: the Ollama manager capability stays absent, which is the browser build the
  // chat's picker runs in — presets then come straight from the edge catalog.
  const pluginManager = setupPluginManager();
  const wrapper = ({ children }: PropsWithChildren) => (
    <PluginManagerProvider.Root value={pluginManager}>{children}</PluginManagerProvider.Root>
  );

  // The selection round-trips through `Chat.session`, so it only moves if what is read back out of the
  // object still carries the model — the defect that left the picker showing the fallback forever.
  test('picking a preset moves the selection', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const settings: Assistant.Settings = {};

      const { result } = renderHook(() => usePresets(settings, chat), { wrapper });
      yield* Effect.promise(() => waitFor(() => expect(result.current.presets?.length ?? 0).toBeGreaterThan(1)));

      const target = result.current.presets?.find(({ id }) => id !== result.current.preset?.id);
      expect(target).toBeDefined();
      result.current.onPresetChange?.(target?.id ?? '');
      yield* Effect.promise(() => waitFor(() => expect(result.current.preset?.id).toBe(target?.id)));
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('a chat with no model of its own stays on the configured local runtime', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const settings: Assistant.Settings = { modelProvider: Provider.ollama.id };

      const { result } = renderHook(() => usePresets(settings, chat), { wrapper });
      yield* Effect.promise(() => waitFor(() => expect(result.current.preset).toBeDefined()));
      expect(result.current.preset?.provider).toBe(Provider.ollama.id);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test("a chat's own local model is not unavailable while the runtime is still listing", async () => {
    await Effect.gen(function* () {
      const loading: Ollama.Manager = {
        endpoint: 'http://localhost:11434',
        state: Atom.make<Ollama.ModelsState>({ kind: 'loading', models: [], loaded: [], pulls: {}, errors: {} }),
        refresh: Effect.void,
        refreshLoaded: Effect.void,
        pull: () => Effect.void,
        cancel: () => Effect.void,
        load: () => Effect.void,
        unload: () => Effect.void,
        remove: () => Effect.void,
      };
      const manager = setupPluginManager({
        capabilities: [Capability.contribute(AssistantCapabilities.OllamaManager, loading)],
      });
      const localWrapper = ({ children }: PropsWithChildren) => (
        <RegistryContext.Provider value={manager.registry}>
          <PluginManagerProvider.Root value={manager}>{children}</PluginManagerProvider.Root>
        </RegistryContext.Provider>
      );

      const model = presetsForProvider(Provider.builtIn.id)[0].model;
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { model } }));
      const settings: Assistant.Settings = { modelProvider: Provider.builtIn.id };

      const { result } = renderHook(() => usePresets(settings, chat), { wrapper: localWrapper });
      yield* Effect.promise(() =>
        waitFor(() => {
          expect(result.current.presets?.length ?? 0).toBeGreaterThan(0);
          expect(result.current.presets?.some((preset) => preset.local)).toBe(false);
        }),
      );
      expect(result.current.preset).toBeUndefined();
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});
