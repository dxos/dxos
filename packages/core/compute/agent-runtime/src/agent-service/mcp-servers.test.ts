//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as McpServer from '@dxos/compute/McpServer';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { startTestServer } from '@dxos/mcp-client/testing';
import { ContentBlock, Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';
import { loadSpaceMcpServers } from './mcp-servers.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

const withTestServer = Effect.acquireRelease(
  Effect.promise(() => startTestServer()),
  (server) => Effect.promise(() => server.close()),
);

/** Text of every tool result in the conversation. */
const toolResults = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const items = yield* Feed.query(feed, Filter.everything()).run;
    return items
      .filter(Obj.instanceOf(Message.Message))
      .flatMap((message) => message.blocks)
      .filter((block): block is ContentBlock.ToolResult => block._tag === 'toolResult')
      .map((block) => JSON.stringify(block.result));
  });

describe('space MCP servers', () => {
  it.effect(
    'only enabled servers are connected, with the credentials stored on them',
    Effect.fnUntraced(
      function* (_) {
        const server = yield* withTestServer;
        yield* Database.add(Obj.make(McpServer.McpServer, { name: 'open', url: server.urls.open, protocol: 'http' }));
        yield* Database.add(
          Obj.make(McpServer.McpServer, { name: 'off', url: server.urls.key, protocol: 'http', enabled: false }),
        );
        yield* Database.add(
          Obj.make(McpServer.McpServer, {
            name: 'oauth',
            url: server.urls.oauth,
            protocol: 'http',
            oauth: { clientId: 'client', tokens: { accessToken: 'token', tokenType: 'Bearer' } },
          }),
        );

        const options = yield* loadSpaceMcpServers();
        expect(options.map(({ url }) => url)).toEqual([server.urls.open, server.urls.oauth]);
        expect(options[0].authProvider).toBeUndefined();
        expect(options[1].authProvider).toBeDefined();
      },
      Effect.provide(AssistantTestLayer({ types: [McpServer.McpServer] })),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a server added to the space is callable by the agent on its next turn',
    Effect.fnUntraced(
      function* (_) {
        const server = yield* withTestServer;
        yield* Database.add(
          Obj.make(McpServer.McpServer, { name: 'weather', url: server.urls.open, protocol: 'http', enabled: true }),
        );

        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the weather in Paris?');
        yield* session.waitForCompletion();

        const results = yield* toolResults(session.feed);
        expect(results.some((result) => result.includes('Weather in Paris'))).toBe(true);
      },
      Effect.provide(
        AssistantTestLayer({
          types: [McpServer.McpServer],
          aiService: scriptedAiService([
            { parts: [toolCall('get_weather', { city: 'Paris' })] },
            { parts: [text('It is sunny in Paris.')] },
          ]),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
