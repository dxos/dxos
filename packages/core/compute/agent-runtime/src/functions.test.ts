//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService } from '@dxos/ai/testing';
import { AiRequest, GenerationObserver, ToolExecutionServices, createToolkit } from '@dxos/assistant';
import { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { AssistantTestLayer, runMemoizedTests } from './testing';

EntityId.dangerouslyDisableRandomness();

const ReadName = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.readName'),
    name: 'Read Name',
    description: 'Reads the name of an organization.',
  },
  input: Schema.Struct({
    org: Ref.Ref(Organization.Organization),
  }),
  output: Schema.String,
  services: [Database.Service],
});

const Handlers = OperationHandlerSet.make(
  Operation.withHandler(
    ReadName,
    Effect.fn(function* ({ org }) {
      const resolved = yield* Database.load(org);
      return resolved.name ?? '<no org>';
    }),
  ),
);

const skill = Skill.make({
  key: 'org.dxos.skill.test',
  name: 'Test skill',
  tools: Skill.toolDefinitions({ operations: [ReadName] }),
});

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ToolExecutionServices),
  Layer.provideMerge(
    AssistantTestLayer({
      aiServicePreset: 'edge-remote',
      operationHandlers: Handlers,
      types: [Organization.Organization],
    }),
  ),
);

describe.skipIf(!runMemoizedTests())('Research', () => {
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
        yield* Database.flush();
        yield* new AiRequest.Request({ observer: GenerationObserver.fromPrinter(new ConsolePrinter()) }).run({
          prompt: `What is the name of the organization? ${org.id}`,
          toolkit: yield* createToolkit({
            skills: [skill],
          }),
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
