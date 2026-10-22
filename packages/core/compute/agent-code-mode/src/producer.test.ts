//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AccessToken, Connection } from '@dxos/link';
import { startTestServer } from '@dxos/mcp-client/testing';
import { type ContentBlock, Message } from '@dxos/types';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import { EVAL_TOOL_NAME } from './eval-tool.ts';
import { makeCodeModeTurnProducer } from './producer.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

const withTestServer = Effect.acquireRelease(
  Effect.promise(() => startTestServer()),
  (server) => Effect.promise(() => server.close()),
);

/** The same call to the test server's one tool, written in each dialect. */
const DIALECTS = [
  { name: 'plain', dialect: PlainDialect, code: `print(await ops['mcp__localhost__get_weather']({ city: 'Paris' }));` },
  {
    name: 'effect',
    dialect: EffectDialect,
    code: `yield* print(yield* Tools['mcp__localhost__get_weather']({ city: 'Paris' }));`,
  },
];

describe('code mode', () => {
  describe.each(DIALECTS)('$name dialect', ({ dialect, code }) => {
    it.effect(
      "calls a connection's MCP tools from code",
      Effect.fnUntraced(
        function* (_) {
          const server = yield* withTestServer;
          yield* Database.add(
            Connection.make({ connectorId: 'mcp', mcp: { url: server.urls.open, protocol: 'http' } }),
          );

          const session = yield* AgentService.createSession();
          yield* session.submitPrompt('What is the weather in Paris?');
          yield* session.waitForCompletion();

          const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
          const results = messages
            .flatMap((message) => message.blocks)
            .filter((block): block is ContentBlock.ToolResult => block._tag === 'toolResult');
          expect(results).toEqual([expect.objectContaining({ name: EVAL_TOOL_NAME })]);
          expect(results[0].error).toBeUndefined();
          expect(JSON.stringify(results[0].result)).toContain('Weather in Paris');
        },
        Effect.provide(
          AssistantTestLayer({
            types: [AccessToken.AccessToken, Connection.Connection],
            agent: { makeTurnProducer: makeCodeModeTurnProducer({ dialect }) },
            aiService: scriptedAiService([
              { parts: [toolCall(EVAL_TOOL_NAME, { code })] },
              { parts: [text('It is sunny in Paris.')] },
            ]),
          }),
        ),
        TestHelpers.provideTestContext,
      ),
      { timeout: 30_000 },
    );
  });
});
