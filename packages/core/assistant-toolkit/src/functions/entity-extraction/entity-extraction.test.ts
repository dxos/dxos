//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Message, Organization, Person } from '@dxos/types';

import { ResearchGraph } from '../research';

import { default as entityExtraction } from './entity-extraction';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  functions: [entityExtraction],
  types: [Blueprint.Blueprint, Message.Message, Person.Person, Organization.Organization, ResearchGraph],
});

describe('Entity extraction', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        const email = yield* Database.add(
          Obj.make(Message.Message, {
            [Obj.Meta]: {
              tags: ['important'],
            },
            created: new Date('2025-01-01').toISOString(),
            sender: {
              name: 'John Smith',
              email: 'john.smith@anthropic.com',
            },
            blocks: [
              {
                _tag: 'text',
                text: "Hey team, what's up?",
              },
              {
                _tag: 'text',
                text: "I'm working on a new algorithm today.",
              },
              {
                _tag: 'text',
                text: 'Anything new from the research team?',
              },
            ],
          }),
        );
        yield* Database.flush({ indexes: true });
        const result = yield* FunctionInvocationService.invokeFunction(entityExtraction, {
          source: email,
        });
        expect(result.entities).toHaveLength(2);
        for (const entity of result.entities ?? []) {
          expect(Obj.getMeta(entity)?.tags).toContain('important');
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
