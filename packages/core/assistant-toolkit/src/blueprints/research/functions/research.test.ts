//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { inspect } from 'node:util';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AgentService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { OperationHandlerSet } from '@dxos/operation';
import { MarkdownBlueprint } from '@dxos/plugin-markdown/blueprints';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject, Organization } from '@dxos/types';

import { MarkdownHandlers } from '../../markdown';
import ResearchBlueprint from '../blueprint';
import { ResearchHandlers } from '../functions';
import { ResearchDataTypes, ResearchGraph } from '../types';
import { default as research } from './research';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.merge(ResearchHandlers, MarkdownHandlers),
  types: [
    ...ResearchDataTypes,
    ResearchGraph.ResearchGraph,
    Blueprint.Blueprint,
    Markdown.Document,
    HasSubject.HasSubject,
    Feed.Feed,
  ],
  blueprints: [ResearchBlueprint.make(), MarkdownBlueprint.make()],
});

const AgentTestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(ResearchHandlers, MarkdownHandlers),
  types: [
    ...ResearchDataTypes,
    ResearchGraph.ResearchGraph,
    Blueprint.Blueprint,
    Markdown.Document,
    HasSubject.HasSubject,
    Feed.Feed,
  ],
  blueprints: [ResearchBlueprint.make(), MarkdownBlueprint.make()],
});

describe('Research', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(
          Obj.make(Organization.Organization, {
            name: 'BlueYard',
            website: 'https://blueyard.com',
          }),
        );
        yield* Database.flush();
        const result = yield* FunctionInvocationService.invokeFunction(research, {
          query: 'Founders and portfolio of BlueYard.',
        });

        console.log(inspect(result, { depth: null, colors: true }));
        console.log(JSON.stringify(result, null, 2));

        yield* Database.flush();
        const researchGraph = yield* ResearchGraph.query();
        if (researchGraph) {
          const data = yield* Database.load(researchGraph.queue).pipe(
            Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
          );
          console.log(inspect(data, { depth: null, colors: true }));
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.effect(
    'create and update research report',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(
          Obj.make(Organization.Organization, {
            name: 'BlueYard',
            website: 'https://blueyard.com',
          }),
        );

        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint.make(), MarkdownBlueprint.make()],
          context: [Ref.make(organization)],
        });

        yield* agent.submitPrompt(`Create a research summary about ${organization.name}.`);
        yield* agent.waitForCompletion();
        {
          const docs = yield* Database.runQuery(
            Query.select(Filter.id(organization.id)).targetOf(HasSubject.HasSubject).source(),
          );
          if (docs.length !== 1) {
            throw new Error(`Expected 1 research document; got ${docs.length}: ${docs.map((_) => (_ as any).name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }

        yield* agent.submitPrompt('Add a section about their portfolio.');
        yield* agent.waitForCompletion();
        {
          const docs = yield* Database.runQuery(
            Query.select(Filter.id(organization.id)).targetOf(HasSubject.HasSubject).source(),
          );
          if (docs.length !== 1) {
            throw new Error(`Expected 1 research document; got ${docs.length}: ${docs.map((_) => (_ as any).name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }
      },
      Effect.provide(AgentTestLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('flaky'),
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
