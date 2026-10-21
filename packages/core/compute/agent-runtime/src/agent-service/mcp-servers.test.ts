//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { AccessToken, Connection } from '@dxos/link';
import { startTestServer } from '@dxos/mcp-client/testing';
import { ContentBlock, Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';
import { loadMcpServers } from './mcp-servers.ts';

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

describe('MCP servers', () => {
  it.effect(
    'connects each connection with an endpoint the conversation has not turned off',
    Effect.fnUntraced(
      function* (_) {
        const server = yield* withTestServer;
        const feed = yield* Database.add(Feed.make());
        const token = yield* Database.add(AccessToken.make({ source: 'mcp.test', token: server.apiKey }));
        yield* Database.add(
          Connection.make({
            connectorId: 'mcp',
            mcp: { url: server.urls.key, protocol: 'http' },
            accessToken: Ref.make(token),
          }),
        );
        const off = yield* Database.add(
          Connection.make({ connectorId: 'mcp', mcp: { url: server.urls.oauth, protocol: 'http' } }),
        );
        yield* Database.add(Connection.make({ connectorId: 'native' }));
        yield* Feed.append(feed, [
          Obj.make(AiContext.Binding, {
            skills: { added: [], removed: [] },
            objects: { added: [], removed: [] },
            connections: { added: [], removed: [Ref.make(off)] },
          }),
        ]);

        const credentials = Layer.succeed(Credential.CredentialsService, {
          queryCredentials: async () => [],
          getCredential: async ({ accessTokenId }) => ({
            service: 'mcp.test',
            apiKey: accessTokenId === token.id ? server.apiKey : undefined,
          }),
        });
        const stored = yield* loadMcpServers({ feed }).pipe(Effect.provide(credentials));
        expect(stored).toEqual([{ url: server.urls.key, protocol: 'http', apiKey: server.apiKey }]);

        // A host that knows the connector registry also resolves a connector's declared endpoint.
        const resolved = yield* loadMcpServers({
          feed,
          endpointOf: (connection) =>
            connection.connectorId === 'native' ? { url: server.urls.open, protocol: 'http' } : connection.mcp,
        }).pipe(Effect.provide(credentials));
        expect(resolved.map(({ url }) => url).sort()).toEqual([server.urls.key, server.urls.open].sort());
      },
      Effect.provide(
        AssistantTestLayer({ types: [AccessToken.AccessToken, AiContext.Binding, Connection.Connection] }),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a connection added to the space is callable by the agent on its next turn',
    Effect.fnUntraced(
      function* (_) {
        const server = yield* withTestServer;
        yield* Database.add(Connection.make({ connectorId: 'mcp', mcp: { url: server.urls.open, protocol: 'http' } }));

        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the weather in Paris?');
        yield* session.waitForCompletion();

        const results = yield* toolResults(session.feed);
        expect(results.some((result) => result.includes('Weather in Paris'))).toBe(true);
      },
      Effect.provide(
        AssistantTestLayer({
          types: [AccessToken.AccessToken, Connection.Connection],
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
