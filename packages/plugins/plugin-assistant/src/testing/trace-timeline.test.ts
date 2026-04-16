//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { AssistantTestLayer, AssistantTestLayerWithTriggers } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Query, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { ObjectId } from '@dxos/keys';
import { dbg } from '@dxos/log';
import { renderTimelineAscii } from '@dxos/react-ui-components';
import { Organization, Person } from '@dxos/types';

import { buildExecutionGraph } from '../containers/TracePanel/execution-graph';

ObjectId.dangerouslyDisableRandomness();

const queryTraceMessages = Effect.gen(function* () {
  yield* FeedTraceSink.flush();
  yield* Database.flush();
  const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
  return yield* Database.runQuery(Query.select(Filter.type(Trace.Message)).from(feed));
});

const TestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person],
  blueprints: [DatabaseBlueprint.make()],
  tracing: 'feed',
  aiServicePreset: 'edge-remote',
});

describe('Trace timeline', () => {
  describe('database blueprint — create objects', () => {
    it.effect(
      'create objects via AgentService',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({
            blueprints: [DatabaseBlueprint.make()],
          });
          yield* agent.submitPrompt('Create an organization called "Cyberdyne Systems".');
          yield* agent.waitForCompletion();

          yield* agent.submitPrompt('Create a person named "John Connor".');
          yield* agent.waitForCompletion();

          const messages = yield* queryTraceMessages;
          dbg(messages.flatMap(({ meta, events }) => events.map((event) => ({ ...meta, ...event }))));
          const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
          dbg(branches);
          const graph = renderTimelineAscii(commits, branches);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     [atom] Agent processing request...
            ├──●  [user] Create an organization called "Cyberdyne Systems".
            │  ●  [drone] Let me first check the available schemas to find the right type for an organization.
            │  ●  [wrench] list-schemas
            │  ●  [check-circle] list-schemas - Success
            │  ●  [drone] I found the \`org.dxos.type.organization\` schema. Let me create the organization now.
            │  ●  [wrench] create-object
            │  ●  [check-circle] create-object - Success
            │  ●  [wrench] add-to-context
            │  ●  [check-circle] add-to-context - Success
            │  ●  [drone] I've created the **Cyberdyne Systems** organization and added it to the conversation context. It's b
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Create a person named "John Connor".
            │  ●  [wrench] create-object
            │  ●  [check-circle] create-object - Success
            │  ●  [wrench] add-to-context
            │  ●  [check-circle] add-to-context - Success
            │  ●  [drone] I've created **John Connor** as a person and added him to the conversation context. Would you like t
            ◆──╯  [check-circle] Agent completed request
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );
  });

  describe('prompt with agent', () => {
    it.effect(
      'invoke prompt and query schema',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({
            blueprints: [DatabaseBlueprint.make()],
          });
          yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
          yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
          yield* agent.submitPrompt('Search for all organizations. How many are there?');
          yield* agent.waitForCompletion();

          const messages = yield* queryTraceMessages;
          const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
          const graph = renderTimelineAscii(commits, branches);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     [atom] Agent processing request...
            ├──●  [user] Search for all organizations. How many are there?
            │  ●  [wrench] list-schemas
            │  ●  [wrench] query
            │  ●  [check-circle] query - Success
            │  ●  [check-circle] list-schemas - Success
            │  ●  [drone] Now let me do a precise type-based query to make sure I get the full count:
            │  ●  [wrench] query
            │  ●  [check-circle] query - Success
            │  ●  [drone] There are **2 organizations** in the space:
            ◆──╯  [check-circle] Agent completed request
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );
  });

  describe('multi-turn conversation', () => {
    it.effect(
      'sequential prompts in a session',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({
            blueprints: [DatabaseBlueprint.make()],
          });
          yield* agent.submitPrompt('List all available schemas. Tell me what typenames are available.');
          yield* agent.waitForCompletion();

          yield* agent.submitPrompt('Create an organization called "DXOS" and a person named "Alice".');
          yield* agent.waitForCompletion();

          yield* agent.submitPrompt('Search for all organizations and persons.');
          yield* agent.waitForCompletion();

          const messages = yield* queryTraceMessages;
          const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
          const graph = renderTimelineAscii(commits, branches);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     [atom] Agent processing request...
            ├──●  [user] List all available schemas. Tell me what typenames are available.
            │  ●  [wrench] list-schemas
            │  ●  [check-circle] list-schemas - Success
            │  ●  [drone] Here are all the available schemas and their typenames:
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Create an organization called "DXOS" and a person named "Alice".
            │  ●  [wrench] create-object
            │  ●  [wrench] create-object
            │  ●  [check-circle] create-object - Success
            │  ●  [check-circle] create-object - Success
            │  ●  [drone] Done! I've created both:
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Search for all organizations and persons.
            │  ●  [wrench] query
            │  ●  [wrench] query
            │  ●  [check-circle] query - Success
            │  ●  [check-circle] query - Success
            │  ●  [drone] Here are the results:
            ◆──╯  [check-circle] Agent completed request
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 180_000 },
    );
  });
});
