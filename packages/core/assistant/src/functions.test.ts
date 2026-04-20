//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService } from '@dxos/ai/testing';
import {
  AiRequest,
  GenerationObserver,
  ToolExecutionServices,
  createToolkit,
  formatSystemPrompt,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import { Organization } from '@dxos/types';

import { AssistantTestLayer } from './testing';

ObjectId.dangerouslyDisableRandomness();

const ReadName = Operation.make({
  meta: {
    key: 'org.dxos.function.read-name',
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
    Effect.fnUntraced(function* ({ org }) {
      const resolved = yield* Database.load(org);
      return resolved.name ?? '<no org>';
    }),
  ),
);

const blueprint = Blueprint.make({
  key: 'org.dxos.blueprint.test',
  name: 'Test blueprint',
  tools: Blueprint.toolDefinitions({ operations: [ReadName] }),
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
        yield* Database.flush();

        const request = new AiRequest({ observer: GenerationObserver.fromPrinter(new ConsolePrinter()) });
        const prompt = `What is the name of the organization? ${org.id}`;

        yield* request.begin({ prompt });

        const resolvedToolkit = yield* createToolkit({ blueprints: [blueprint] });
        const system = yield* formatSystemPrompt({}).pipe(Effect.orDie);

        do {
          const { done } = yield* request.runAgentTurn({ system, toolkit: resolvedToolkit });
          if (done) {
            break;
          }
          yield* request.runTools({ toolkit: resolvedToolkit });
        } while (true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
