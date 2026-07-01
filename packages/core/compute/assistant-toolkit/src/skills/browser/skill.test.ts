//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { MemoizedAiService } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { OperationHandlerSet, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayerWithTriggers } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { WithProperties } from '@dxos/plugin-markdown/testing';
import { Person } from '@dxos/types';

import { DatabaseHandlers, DatabaseSkill } from '../database';
import BrowserSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(DatabaseHandlers, MarkdownOperationHandlerSet),
  types: [Skill.Skill, Person.Person, Markdown.Document, SpaceProperties, Collection.Collection, Feed.Feed],
  skills: [BrowserSkill.make(), MarkdownSkill.make(), DatabaseSkill.make()],
  tracing: 'pretty',
});

// NOTE: Not run by default since it acceses internet.
describe('Browser', { tags: ['llm'] }, () => {
  it.effect(
    'scrape effect blog',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [BrowserSkill.make(), MarkdownSkill.make(), DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(`
          Scrape effect blog at https://effect.website/blog and find the content of last 3 articles.
          Create/update Person object for each author.
          Create Markdown document for each article.
        `);
        yield* agent.waitForCompletion();
        const people = yield* Database.query(Query.type(Person.Person)).run;
        log.info(`people`, { people });
        const documents = yield* Database.query(Query.type(Markdown.Document)).run;
        log.info(`documents`, { documents });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000, tags: ['sync'] },
  );
});
