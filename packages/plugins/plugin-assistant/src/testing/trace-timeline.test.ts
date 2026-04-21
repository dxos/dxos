//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import {
  AgentHandlers,
  AgentPrompt,
  DatabaseBlueprint,
  DatabaseHandlers,
  WebSearchBlueprint,
  WebSearchHandlers,
  WebSearchToolkitOpaque,
} from '@dxos/assistant-toolkit';
import { AssistantTestLayerWithTriggers } from '@dxos/assistant/testing';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ExampleHandlers, Reply, Trace, Trigger } from '@dxos/functions';
import { FeedTraceSink, TriggerDispatcher } from '@dxos/functions-runtime';
import { ObjectId } from '@dxos/keys';
import { dbg } from '@dxos/log';
import { Operation } from '@dxos/operation';
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
  types: [Organization.Organization, Person.Person],
  blueprints: [DatabaseBlueprint.make(), WebSearchBlueprint.make()],
  operationHandlers: [DatabaseHandlers, AgentHandlers, WebSearchHandlers, ExampleHandlers],
  toolkits: [WebSearchToolkitOpaque],
  tracing: 'feed',
  aiServicePreset: 'edge-remote',
});

describe('Trace timeline', () => {
  describe('Agent', () => {
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
            │  ●  [check-circle] list-schemas - Success
            │  ●  [check-circle] create-object - Success
            │  ●  [check-circle] add-to-context - Success
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Create a person named "John Connor".
            │  ●  [check-circle] create-object - Success
            │  ●  [check-circle] add-to-context - Success
            ◆──╯  [check-circle] Agent completed request
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );

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
            │  ●  [check-circle] list-schemas - Success
            │  ●  [check-circle] query - Success
            │  ●  [check-circle] query - Success
            ◆──╯  [check-circle] Agent completed request
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );

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
            │  ●  [check-circle] list-schemas - Success
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Create an organization called "DXOS" and a person named "Alice".
            │  ●  [check-circle] create-object - Success
            │  ●  [check-circle] create-object - Success
            ◆──╯  [check-circle] Agent completed request
            ●  │  [atom] Agent processing request...
            │  ●  [user] Search for all organizations and persons.
            │  ●  [check-circle] query - Success
            │  ●  [check-circle] query - Success
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

  describe('Triggers', () => {
    it.effect(
      'prompt trigger',
      Effect.fnUntraced(
        function* ({ expect }) {
          const feed = yield* Database.add(Feed.make());
          yield* Feed.append(feed, [
            Obj.make(Organization.Organization, {
              name: 'DXOS',
            }),
          ]);
          const prompt = yield* Database.add(
            Prompt.make({
              name: 'Research',
              instructions: 'Research the given topic, or object.',
              blueprints: [Ref.make(yield* Blueprint.upsert(WebSearchBlueprint.key))],
            }),
          );
          yield* Database.add(
            Trigger.make({
              function: Ref.make(Operation.serialize(AgentPrompt)),
              enabled: true,
              spec: Trigger.specFeed(feed),
              input: {
                prompt: Ref.make(prompt),
                input: '{{event.item}}',
              },
            }),
          );

          const dispatcher = yield* TriggerDispatcher;
          yield* dispatcher
            .invokeScheduledTriggers({ kinds: ['queue'], untilExhausted: true })
            .pipe(Effect.flatMap(Effect.forEach((result) => result.result)));

          const messages = yield* queryTraceMessages;
          const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
          const graph = renderTimelineAscii(commits, branches);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●     [play] Agent
            ├──●  [user] Research the given topic, or object.
            │  ●  [check-circle] AnthropicWebSearch - Success
            │  ●  [check-circle] AnthropicWebSearch - Success
            │  ●  [check-circle] AnthropicWebSearch - Success
            │  ●  [check-circle] AnthropicWebSearch - Success
            │  ●  [check-circle] AnthropicWebSearch - Success
            │  ●  [check-circle] complete_job - Success
            ◆──╯  [check-circle] Agent
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );
  });

  describe('Operations', () => {
    it.effect(
      'operation',
      Effect.fnUntraced(
        function* ({ expect }) {
          yield* Operation.invoke(Reply, { data: 'test-1' });
          yield* Operation.invoke(Reply, { data: 'test-2' });
          yield* Operation.invoke(Reply, { data: 'test-3' });

          const messages = yield* queryTraceMessages;
          const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
          const graph = renderTimelineAscii(commits, branches);
          expect(`\n${graph}\n`).toMatchInlineSnapshot(`
            "
            ●  [check-circle] Reply
            ●  [check-circle] Reply
            ●  [check-circle] Reply
            "
          `);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 120_000 },
    );
  });
});
