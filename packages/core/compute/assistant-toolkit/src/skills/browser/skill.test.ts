//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { LanguageModelFixture } from '@dxos/ai/testing';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Database, Feed, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { Person } from '@dxos/types';

import { ChatContextHandlers, ChatContextSkill } from '../chat-context/index.ts';
import BrowserSkill from './skill.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(ChatContextHandlers, MarkdownOperationHandlerSet.handlers),
  types: [Skill.Skill, Person.Person, Markdown.Document, SpaceProperties, Collection.Collection, Feed.Feed],
  skills: [BrowserSkill.make(), MarkdownSkill.make(), ChatContextSkill.make()],
  tracing: 'pretty',
});

// NOTE: Not run by default since it acceses internet.
describe('Browser', { tags: ['manual'] }, () => {
  it.effect(
    'scrape effect blog',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [BrowserSkill.make(), MarkdownSkill.make(), ChatContextSkill.make()],
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
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 240_000 : 30_000, tags: ['sync'] },
  );
});
