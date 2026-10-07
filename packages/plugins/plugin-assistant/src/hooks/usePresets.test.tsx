//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { setupPluginManager } from '@dxos/app-framework/testing';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Message, Task } from '@dxos/types';

import { type Assistant } from '#types';

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
});
