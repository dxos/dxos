//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ConsolePrinter } from '@dxos/ai';
import { LanguageModelFixture } from '@dxos/ai/testing';
import { AiRequest, GenerationObserver, ToolExecutionServices, createToolkit } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { AssistantTestLayer } from './testing';

EntityId.dangerouslyDisableRandomness();

const ReadName = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.readName'),
    name: 'Read Name',
    description: 'Reads the name of an organization.',
  },
  input: Schema.Struct({
    org: Ref.Ref(Organization.Organization),
  }),
  output: Schema.String,
  services: [Database.Service],
});

/**
 * A self-referential tool input. The registry stores an operation as JSON schema, so resolving it
 * back into a tool decodes a cyclic document -- the case that recursed until the stack blew.
 */
interface Comment {
  readonly text: string;
  readonly reply?: Comment;
}
const Comment: Schema.Codec<Comment> = Schema.Struct({
  text: Schema.String,
  reply: Schema.optional(Schema.suspend((): Schema.Codec<Comment> => Comment)),
});

const CountReplies = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.countReplies'),
    name: 'Count Replies',
    description: 'Counts the number of replies nested inside a comment thread.',
  },
  input: Schema.Struct({ comment: Comment }),
  output: Schema.Number,
});

const Handlers = OperationHandlerSet.make(
  Operation.withHandler(
    ReadName,
    Effect.fn(function* ({ org }) {
      const resolved = yield* Database.load(org);
      return resolved.name ?? '<no org>';
    }),
  ),
  Operation.withHandler(
    CountReplies,
    Effect.fn(function* ({ comment }) {
      let count = 0;
      for (let node = comment.reply; node !== undefined; node = node.reply) {
        count++;
      }
      return count;
    }),
  ),
);

const skill = Skill.make({
  key: 'org.dxos.skill.test',
  name: 'Test skill',
  tools: Skill.toolDefinitions({ operations: [ReadName] }),
});

// Kept separate from `skill`: adding a tool there would change the recorded request of the test
// above, whose fixture is keyed on the tool list.
const recursiveSkill = Skill.make({
  key: 'org.dxos.skill.recursive',
  name: 'Recursive input skill',
  tools: Skill.toolDefinitions({ operations: [CountReplies] }),
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

describe('Research', { tags: ['model-fixture'] }, () => {
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
    LanguageModelFixture.isUpdateEnabled() ? 240_000 : 30_000,
  );

  it.effect(
    'call a function with a recursive input',
    Effect.fnUntraced(
      function* (_) {
        yield* new AiRequest.Request({ observer: GenerationObserver.fromPrinter(new ConsolePrinter()) }).run({
          prompt: 'How many replies are nested under this comment? { text: "a", reply: { text: "b" } }',
          toolkit: yield* createToolkit({
            skills: [recursiveSkill],
          }),
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    LanguageModelFixture.isUpdateEnabled() ? 240_000 : 30_000,
  );
});
