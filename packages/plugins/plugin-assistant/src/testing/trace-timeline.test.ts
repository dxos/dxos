//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Query, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { ObjectId } from '@dxos/keys';
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

const renderTraceGraph = (traceMessages: Trace.Message[]) => {
  const { commits } = buildExecutionGraph({ traceMessages });
  return renderTimelineAscii(commits);
};

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person, Tag.Tag, Blueprint.Blueprint, Feed.Feed],
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
          const graph = renderTraceGraph(messages);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     Create an organization called "Cyberdyne Systems".
            ●     Let me first check the available schemas to find the right type for an organization.
            ●     list-schemas
            │  ●  List schemas
            ●  │  Success
            ●  │  I found the \`org.dxos.type.organization\` schema. Let me create the organization now.
            ●  │  create-object
            │  ●  Create object
            ●  │  Success
            ●  │  add-to-context
            │  ●  Add to context
            ●  │  Success
            ●  │  I've created the **Cyberdyne Systems** organization and added it to the chat context. The organizati
            ●  │  Create a person named "John Connor".
            ●  │  create-object
            │  ●  Create object
            ●  │  Success
            ●  │  add-to-context
            │  ●  Add to context
            ●     Success
            ●     I've created **John Connor** as a person and added him to the chat context. You can add more details
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
          const graph = renderTraceGraph(messages);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     Search for all organizations. How many are there?
            ●     list-schemas
            ●     query
            │  ●  Query
            │  ●  List schemas
            ●  │  Success
            ●  │  Success
            ●  │  Now let me do a precise type-based query to make sure I get all organizations:
            ●  │  query
            │  ●  Query
            ●     Success
            ●     There are **2 organizations** in the space:

            1. **Acme Corp**
            2. **Globex Industries**
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
          const graph = renderTraceGraph(messages);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     List all available schemas. Tell me what typenames are available.
            ●     list-schemas
            │  ●  List schemas
            ●  │  Success
            ●  │  Here are all the available schemas and their typenames:

            | # | Typename | Description |
            |---|-------
            ●  │  Create an organization called "DXOS" and a person named "Alice".
            ●  │  create-object
            ●  │  create-object
            │  ●  Create object
            │  ●  Create object
            ●  │  Success
            ●  │  Success
            ●  │  Done! I've created both:

            1. **Organization** — "DXOS" (\`dxn:echo:BDJXMULPW5FB55UZ7KP5HLDHVTXUTHE2U:
            ●  │  Search for all organizations and persons.
            ●  │  query
            ●  │  query
            │  ●  Query
            │  ●  Query
            ●     Success
            ●     Success
            ●     Here are the results:

            ### Organizations (1)
            | Name | DXN |
            |------|-----|
            | DXOS | \`dxn:echo:...01J
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
