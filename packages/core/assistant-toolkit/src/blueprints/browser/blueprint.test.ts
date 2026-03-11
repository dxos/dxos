//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AiConversationService } from '@dxos/assistant';
import { AssistantTestLayerWithTriggers } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { MarkdownBlueprint } from '@dxos/plugin-markdown/blueprints';
import { WithProperties } from '@dxos/plugin-markdown/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { DatabaseBlueprint } from '../database';
import { addBlueprints } from '../testing';

import BrowserBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayerWithTriggers({
  aiServicePreset: 'edge-remote',
  functions: [DatabaseBlueprint, MarkdownBlueprint, BrowserBlueprint].flatMap((blueprint) => blueprint.functions),
  types: [Blueprint.Blueprint, Person.Person, Markdown.Document, SpaceProperties, Collection.Collection],
  tracing: 'pretty',
});

describe('Browser', () => {
  it.scoped(
    'scrape effect blog',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([BrowserBlueprint, MarkdownBlueprint, DatabaseBlueprint]);
        yield* AiConversationService.run({
          system: NON_INTERACTIVE_SYSTEM,
          prompt: `
            Scrape effect blog at https://effect.website/blog and find the content of last 3 articles.
            Create/update Person object for each author.
            Create Markdown document for each article.
          `,
        });
        const people = yield* Database.runQuery(Query.type(Person.Person));
        log.info(`people`, { people });
        const documents = yield* Database.runQuery(Query.type(Markdown.Document));
        log.info(`documents`, { documents });
      },
      WithProperties, // TODO(dmaretskyi): Still required.
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('sync'),
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});

const NON_INTERACTIVE_SYSTEM = trim`
  You are running in a non-interactive session.
  Do not ask questions.
  Complete the task, if unable to complete the task, inform why in a detailed and factual way, (i.e. "I tried to use tool X but got error Y").
`;
