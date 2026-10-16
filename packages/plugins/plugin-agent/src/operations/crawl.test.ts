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
import { AgentOperation, Mode } from '#types';

const EDGE_URL = 'https://edge.test';

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Agent.Agent, Chat.Chat, Skill.Skill, Feed.Feed, Text.Text, Instructions.Instructions, Mode.Mode],
  disableLlmMemoization: true,
  extraServices: Layer.succeed(EdgeHttpClientService, new EdgeHttpClient(EDGE_URL)),
});

const status = {
  runStatus: 'running',
  summary: { done: false, errored: 0 },
  targets: [{ id: 'channel:c1', channelId: 'c1', depth: 0, status: 'active' }],
  facts: 0,
  messages: 0,
};

type Call = { method?: string; pathname: string; body?: unknown };

/** Answers every crawl route with {@link status} and records what was sent. */
const stubEdge = (): Call[] => {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth') {
      return new Response(null, { status: 404 });
    }
    calls.push({
      method: init?.method,
      pathname: url.pathname,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify({ success: true, data: status }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
};

describe('crawl operations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    "address the agent's brain in its space and send the fact feed by its EID",
    Effect.fnUntraced(
      function* ({ expect }) {
        const calls = stubEdge();
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const feed = yield* Database.add(Feed.make({ name: 'Facts' }));
        const spaceId = yield* Database.spaceId;
        const base = `/compute/brain/${spaceId}/${agent.id}/crawl`;

        const configured = yield* Operation.invoke(AgentOperation.ConfigureCrawl, {
          agent: agentRef,
          applicationId: 'app-1',
          channels: ['c1'],
          maxDays: 30,
          factFeed: Ref.make(feed),
        });
        expect(configured.runStatus).toBe('running');
        yield* Operation.invoke(AgentOperation.GetCrawlStatus, { agent: agentRef });
        yield* Operation.invoke(AgentOperation.PauseCrawl, { agent: agentRef });
        yield* Operation.invoke(AgentOperation.ResumeCrawl, { agent: agentRef });
        yield* Operation.invoke(AgentOperation.ResetCrawl, { agent: agentRef, targets: ['channel:c1'] });

        expect(calls.map(({ method, pathname }) => `${method} ${pathname}`)).toEqual([
          `PUT ${base}`,
          `GET ${base}`,
          `POST ${base}/pause`,
          `POST ${base}/resume`,
          `POST ${base}/reset`,
        ]);
        expect(calls[0].body).toEqual({
          applicationId: 'app-1',
          channels: ['c1'],
          maxDays: 30,
          factFeed: Obj.getURI(feed),
        });
        expect(calls[4].body).toEqual({ targets: ['channel:c1'] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
