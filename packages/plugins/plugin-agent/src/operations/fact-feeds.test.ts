//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, vi } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';
import { TestHelpers } from '@dxos/effect/testing';
import { Text } from '@dxos/schema';

import { AgentOperationHandlerSet } from '#operations';
import { AgentOperation, AgentPresence, Mode } from '#types';

const EDGE_URL = 'https://edge.test';

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Agent.Agent, Chat.Chat, Skill.Skill, Feed.Feed, Text.Text, Instructions.Instructions, Mode.Mode],
  disableLlmMemoization: true,
  extraServices: Layer.succeed(EdgeHttpClientService, new EdgeHttpClient(EDGE_URL)),
});

type Call = { method?: string; path: string; body?: unknown };

/** Answers every fact feed route with `feeds` and records what was sent. */
const stubEdge = (feeds: string[]): Call[] => {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth') {
      return new Response(null, { status: 404 });
    }
    calls.push({
      method: init?.method,
      path: `${url.pathname}${url.search}`,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify({ success: true, data: { feeds } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
};

describe('fact feed operations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    "address the agent's brain in its space and send the feed by its EID",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const feed = yield* Database.add(Feed.make({ name: 'Facts' }));
        const uri = String(Obj.getURI(feed));
        const calls = stubEdge([uri]);
        const spaceId = yield* Database.spaceId;
        const base = `/compute/brain/${spaceId}/${encodeURIComponent(AgentPresence.brainId(agent))}/fact-feeds`;

        const added = yield* Operation.invoke(AgentOperation.AddFactFeed, { agent: agentRef, feed: Ref.make(feed) });
        expect(added.feeds).toEqual([uri]);
        yield* Operation.invoke(AgentOperation.ListFactFeeds, { agent: agentRef });
        yield* Operation.invoke(AgentOperation.RemoveFactFeed, { agent: agentRef, feed: Ref.make(feed) });

        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
          `POST ${base}`,
          `GET ${base}`,
          `DELETE ${base}?${new URLSearchParams({ feed: uri })}`,
        ]);
        expect(calls[0].body).toEqual({ feed: uri });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
