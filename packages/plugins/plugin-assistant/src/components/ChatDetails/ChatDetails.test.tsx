//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { render, screen } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as AtomEx from '@dxos/effect/AtomEx';
import { Text } from '@dxos/schema';

import { ChatContextPanel } from './ChatDetails.tsx';

describe('context drawer', () => {
  const TestLayer = TestDatabaseLayer({ types: [Chat.Chat, Feed.Feed, Text.Text] });

  const setup = Effect.fnUntraced(function* () {
    const db = yield* Database.Service;
    const feed = yield* Database.add(Feed.make());
    const runtime = yield* Effect.context<Database.Service>();
    const registry = AtomEx.makeRegistry();
    const context = new AiContext.Binder({ feed, runtime, registry });
    yield* Effect.promise(() => context.open());
    const wrapper = ({ children }: PropsWithChildren) => (
      <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
    );
    return { db: db.db, feed, context, wrapper };
  });

  test('shows the context of a chat that is not stored yet', async () => {
    await Effect.gen(function* () {
      const { db, feed, context, wrapper } = yield* setup();
      const chat = Chat.make({ feed: Ref.make(feed) });
      render(<ChatContextPanel chat={chat} db={db} context={context} />, { wrapper });
      expect(screen.queryByTestId('assistant.details.context')).not.toBeNull();
      yield* Effect.promise(() => context.close());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});
