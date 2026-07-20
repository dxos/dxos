//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, operationToolCall } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, EID, Feed, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import MarkdownSkill from '../skills/markdown-skill';
import { MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

// The agent's tool-calling behaviour is scripted inline per test via a mock model (no recorded
// conversation to regenerate). The `create` tool's input carries no refs, so it is type-checked
// against the operation's input schema through `operationToolCall`.
const testLayer = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: MarkdownOperationHandlerSet,
    types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
    skills: [MarkdownSkill.make()],
    tracing: 'pretty',
    aiService: ScriptedAiService.layer(script),
  });

describe('create', () => {
  it.effect(
    'call a function to create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const name = 'BlueYard';
        const content = 'Founders and portfolio of BlueYard.';
        const result = yield* Operation.invoke(MarkdownOperation.Create, {
          name,
          content,
        });

        const doc = yield* Database.resolve(EID.parse(result.id), Markdown.Document);
        expect(doc.name).toBe(name);
        const text = yield* Database.load(doc.content);
        expect(text.content).toBe(content);
      },
      WithProperties,
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [MarkdownSkill.make()],
        });
        yield* agent.submitPrompt('Create a document with a cookie recipe.');
        yield* agent.waitForCompletion();

        {
          const docs = yield* Database.query(Query.type(Markdown.Document)).run;
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }
      },
      WithProperties,
      Effect.provide(
        testLayer([
          operationToolCall(MarkdownOperation.Create, {
            name: 'Classic Chocolate Chip Cookies',
            content:
              '# Classic Chocolate Chip Cookies\n\n## Ingredients\n\n- 2¼ cups all-purpose flour\n- 1 tsp baking soda\n- 1 tsp salt\n- 1 cup butter\n- ¾ cup granulated sugar\n- ¾ cup brown sugar\n- 2 eggs\n- 2 tsp vanilla extract\n- 2 cups chocolate chips\n\n## Instructions\n\n1. Preheat the oven to 375°F.\n2. Combine the dry ingredients.\n3. Cream the butter and sugars, then beat in the eggs and vanilla.\n4. Mix in the flour, then fold in the chocolate chips.\n5. Bake for 9–12 minutes until golden.\n',
          }),
          ScriptedAiService.text('I created a document with a classic chocolate chip cookie recipe.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});
