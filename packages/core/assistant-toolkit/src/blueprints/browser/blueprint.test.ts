//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AgentService } from '@dxos/assistant';
import { AssistantTestLayerWithTriggers } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Feed, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { OperationHandlerSet } from '@dxos/operation';
import { MarkdownBlueprint } from '@dxos/plugin-markdown/blueprints';
import { WithProperties } from '@dxos/plugin-markdown/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Person } from '@dxos/types';

import { DatabaseBlueprint, DatabaseHandlers } from '../database';
import { MarkdownHandlers } from '../markdown';

import BrowserBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(DatabaseHandlers, MarkdownHandlers),
  types: [Blueprint.Blueprint, Person.Person, Markdown.Document, SpaceProperties, Collection.Collection, Feed.Feed],
  blueprints: [BrowserBlueprint.make(), MarkdownBlueprint.make(), DatabaseBlueprint.make()],
  tracing: 'pretty',
});

describe('Browser', () => {
  it.effect(
    'scrape effect blog',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [BrowserBlueprint.make(), MarkdownBlueprint.make(), DatabaseBlueprint.make()],
        });
        yield* agent.submitPrompt(`
          Scrape effect blog at https://effect.website/blog and find the content of last 3 articles.
          Create/update Person object for each author.
          Create Markdown document for each article.
        `);
        yield* agent.waitForCompletion();
        const people = yield* Database.runQuery(Query.type(Person.Person));
        log.info(`people`, { people });
        const documents = yield* Database.runQuery(Query.type(Markdown.Document));
        log.info(`documents`, { documents });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('sync'),
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
