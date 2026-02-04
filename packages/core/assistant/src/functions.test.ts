//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService } from '@dxos/ai/testing';
import { AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { defineFunction } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { AssistantTestLayer } from './testing';

ObjectId.dangerouslyDisableRandomness();

const readName = defineFunction({
  key: 'dxos.org/function/read-name',
  name: 'Read Name',
  description: 'Reads the name of an organization.',
  inputSchema: Schema.Struct({
    org: Type.Ref(Organization.Organization),
  }),
  outputSchema: Schema.String,
  handler: Effect.fnUntraced(function* ({ data }) {
    const org = yield* Database.load(data.org);
    return org.name ?? '<no org>';
  }),
});

const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/test',
  name: 'Test blueprint',
  tools: Blueprint.toolDefinitions({ functions: [readName] }),
});

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  functions: [readName],
  types: [Organization.Organization],
});

describe('Research', () => {
  it.effect(
    'call a function with a ref input',
    Effect.fnUntraced(
      function* (_) {
        const org = yield* Database.add(
          Obj.make(Organization.Organization, {
            name: 'BlueYard',
            website: 'https://blueyard.com',
          }),
        );
        yield* Database.flush({ indexes: true });
        yield* new AiSession().run({
          prompt: `What is the name of the organization? ${org.id}`,
          toolkit: yield* createToolkit({
            blueprints: [blueprint],
          }),
          observer: GenerationObserver.fromPrinter(new ConsolePrinter()),
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
