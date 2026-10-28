//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext, AiSession } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import { Database, Feed, Filter, Obj, Ref, Registry } from '@dxos/echo';
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
        // Named after the server's host, since the connection has no name of its own.
        expect(stored).toEqual([{ url: server.urls.key, protocol: 'http', name: 'localhost', apiKey: server.apiKey }]);

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
    'connects a built-in server from the registry only once the conversation turns it on',
    Effect.fnUntraced(
      function* (_) {
        const server = yield* withTestServer;
        const feed = yield* Database.add(Feed.make());
        const builtin = Connection.makeBuiltin({
          key: 'org.dxos.mcp.test',
          name: 'Test',
          mcp: { url: server.urls.open, protocol: 'http' },
        });
        (yield* Registry.Service).add([builtin]);

        const before = yield* loadMcpServers({ feed });
        yield* Feed.append(feed, [
          Obj.make(AiContext.Binding, {
            skills: { added: [], removed: [] },
            objects: { added: [], removed: [] },
            connections: { added: [AiContext.connectionRef(builtin)], removed: [] },
          }),
        ]);
        const after = yield* loadMcpServers({ feed });

        expect(before).toEqual([]);
        expect(after).toEqual([{ url: server.urls.open, protocol: 'http', name: 'test' }]);
      },
      Effect.provide(AssistantTestLayer({ types: [AiContext.Binding, Connection.Connection] })),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'connects every connection to a server, each under its own name',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const endpoint = { url: 'https://mcp.example.com/mcp', protocol: 'http' } as const;
        const first = yield* Database.add(AccessToken.make({ source: 'mcp.example.com', token: 'first' }));
        const second = yield* Database.add(AccessToken.make({ source: 'mcp.example.com', token: 'second' }));
        yield* Database.add(
          Connection.make({ connectorId: 'mcp', name: 'Work', mcp: endpoint, accessToken: Ref.make(first) }),
        );
        yield* Database.add(
          Connection.make({ connectorId: 'mcp', name: 'Personal', mcp: endpoint, accessToken: Ref.make(second) }),
        );

        const credentials = Layer.succeed(Credential.CredentialsService, {
          queryCredentials: async () => [],
          getCredential: async ({ accessTokenId }) => ({
            service: 'mcp.example.com',
            apiKey: accessTokenId === first.id ? 'first' : 'second',
          }),
        });
        expect(yield* loadMcpServers({ feed }).pipe(Effect.provide(credentials))).toEqual([
          { ...endpoint, name: 'work', apiKey: 'first' },
          { ...endpoint, name: 'personal', apiKey: 'second' },
        ]);
      },
      Effect.provide(
        AssistantTestLayer({ types: [AccessToken.AccessToken, AiContext.Binding, Connection.Connection] }),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'names each server after its connection, the same whichever connections are on',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const first = yield* Database.add(
          Connection.make({
            connectorId: 'mcp',
            name: 'GitHub',
            mcp: { url: 'https://one.example.com/mcp', protocol: 'http' },
          }),
        );
        yield* Database.add(
          Connection.make({
            connectorId: 'mcp',
            name: 'GitHub',
            mcp: { url: 'https://two.example.com/mcp', protocol: 'http' },
          }),
        );
        const names = loadMcpServers({ feed }).pipe(Effect.map((servers) => servers.map(({ name }) => name)));
        expect(yield* names).toEqual(['github', 'github-2']);

        // Turning the first off leaves the second's tools under the names the model already knows.
        yield* Feed.append(feed, [
          Obj.make(AiContext.Binding, {
            skills: { added: [], removed: [] },
            objects: { added: [], removed: [] },
            connections: { added: [], removed: [Ref.make(first)] },
          }),
        ]);
        expect(yield* names).toEqual(['github-2']);
      },
      Effect.provide(AssistantTestLayer({ types: [AiContext.Binding, Connection.Connection] })),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'leaves out only a connection whose credential cannot be read, or whose key is gone',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const token = yield* Database.add(AccessToken.make({ source: 'keyed.example.com', token: 'key' }));
        yield* Database.add(
          Connection.make({
            connectorId: 'mcp',
            name: 'Keyed',
            mcp: { url: 'https://keyed.example.com/mcp', protocol: 'http' },
            accessToken: Ref.make(token),
          }),
        );
        yield* Database.add(
          Connection.make({
            connectorId: 'mcp',
            name: 'Open',
            mcp: { url: 'https://open.example.com/mcp', protocol: 'http' },
          }),
        );
        const credentials = (
          getCredential: (query: Credential.CredentialQuery) => Promise<Credential.ServiceCredential>,
        ) => Layer.succeed(Credential.CredentialsService, { queryCredentials: async () => [], getCredential });
        const names = (servers: readonly { name?: string }[]) => servers.map(({ name }) => name);

        // Never offered without its key, which would send an agent to sign in to it itself; the rest connect.
        const unreadable = yield* loadMcpServers({ feed }).pipe(
          Effect.provide(credentials(async () => Promise.reject(new Error('EDGE unreachable')))),
        );
        expect(names(unreadable)).toEqual(['open']);

        const gone = yield* loadMcpServers({ feed }).pipe(
          Effect.provide(credentials(async () => ({ service: 'keyed.example.com', apiKey: undefined }))),
        );
        expect(names(gone)).toEqual(['open']);
      },
      Effect.provide(
        AssistantTestLayer({ types: [AccessToken.AccessToken, AiContext.Binding, Connection.Connection] }),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the agent reaches each of two servers that name a tool alike',
    Effect.fnUntraced(
      function* (_) {
        const first = yield* withTestServer;
        const second = yield* withTestServer;
        yield* Database.add(
          Connection.make({ connectorId: 'mcp', name: 'First', mcp: { url: first.urls.open, protocol: 'http' } }),
        );
        yield* Database.add(
          Connection.make({ connectorId: 'mcp', name: 'Second', mcp: { url: second.urls.open, protocol: 'http' } }),
        );

        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the weather in Paris, by each server?');
        yield* session.waitForCompletion();

        const results = yield* toolResults(session.feed);
        expect(results.filter((result) => result?.includes('Weather in Paris'))).toHaveLength(2);
      },
      Effect.provide(
        AssistantTestLayer({
          types: [AccessToken.AccessToken, Connection.Connection],
          aiService: scriptedAiService([
            {
              parts: [
                toolCall('mcp__first__get_weather', { city: 'Paris' }),
                toolCall('mcp__second__get_weather', { city: 'Paris' }),
              ],
            },
            { parts: [text('Both say it is sunny.')] },
          ]),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'reports a read that fails rather than an empty set of servers',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        yield* Database.add(
          Connection.make({ connectorId: 'mcp', mcp: { url: 'https://mcp.example.com/mcp', protocol: 'http' } }),
        );

        // A feed-scoped read waits on the index, which can time out under load.
        const { db } = yield* Database.Service;
        const timingOut = new Proxy(db, {
          get: (target, property) =>
            property === 'query'
              ? (query: unknown) =>
                  JSON.stringify(query).includes(String(Feed.getFeedUri(feed)))
                    ? { run: () => Promise.reject(new Error('index query timed out')) }
                    : target.query(query as never)
              : Reflect.get(target, property, target),
        });
        const servers = yield* loadMcpServers({ feed }).pipe(
          Effect.provideService(Database.Service, { db: timingOut }),
          Effect.flip,
        );
        expect(servers).toBeInstanceOf(AiSession.McpServersUnavailable);
      },
      Effect.provide(AssistantTestLayer({ types: [AiContext.Binding, Connection.Connection] })),
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
            { parts: [toolCall('mcp__localhost__get_weather', { city: 'Paris' })] },
            { parts: [text('It is sunny in Paris.')] },
          ]),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
