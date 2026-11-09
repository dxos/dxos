//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { TrajectoryStore } from '@dxos/assistant';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Feed, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { type ContentBlock } from '@dxos/types';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import { EVAL_TOOL_NAME } from './eval-tool.ts';
import { makeCodeModeTurnProducer } from './producer.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;
const { EnableSkills, QueryOperations, QuerySkills } = SkillManagerSkill.Operations;

class Ticket extends Type.makeObject<Ticket>(DXN.make('com.example.type.ticket', '0.1.0'))(
  Schema.Struct({ title: Schema.String, priority: Schema.optional(Schema.Number) }),
) {}

/** What the operations below were asked to do, so a test can tell they ran. */
const scored: string[] = [];
const noted: string[] = [];

const Score = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.score'),
    name: 'Score',
    description: 'Scores a title for urgency. Returns its length.',
  },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

const AddNote = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.addNote'),
    name: 'Add note',
    description: 'Adds a note to the notebook.',
  },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  Score.pipe(
    Operation.withHandler(({ title }) =>
      Effect.sync(() => {
        scored.push(title);
        return title.length;
      }),
    ),
  ),
  AddNote.pipe(
    Operation.withHandler(({ text }) =>
      Effect.sync(() => {
        noted.push(text);
        return 'noted';
      }),
    ),
  ),
);

/** Enabled in the conversation. */
const ScoreSkill = Skill.make({
  key: 'com.example.skill.score',
  name: 'Scoring',
  description: 'Scores titles.',
  instructions: Template.make({ source: 'Score titles before ranking them.' }),
  tools: Skill.toolDefinitions({ operations: [Score] }),
});

/** Not enabled, but the agent may enable it. */
const NotesSkill = Skill.make({
  key: 'com.example.skill.notes',
  name: 'Notes',
  description: 'Keeps a notebook.',
  instructions: Template.make({ source: 'Write notes in lower case.' }),
  tools: Skill.toolDefinitions({ operations: [AddNote] }),
  agentCanEnable: true,
});

const name = (operation: Operation.Definition.Any) => JSON.stringify(Operation.toolName(operation));
const key = (operation: Operation.Definition.Any) => String(operation.meta.key);

/** One turn in each dialect: find Score, run it and enable Notes, then run Notes' operation on the next model call. */
const SCENARIOS = [
  {
    name: 'plain',
    dialect: PlainDialect,
    querySkillsCall: `await ops[${name(QuerySkills)}](input)`,
    steps: [
      `print(await ops[${name(QueryOperations)}]({ query: 'urgency' }));`,
      `print(await ops[${name(Score)}]({ title: 'Write the docs' }));\n` +
        `print(await ops[${name(EnableSkills)}]({ keys: ['com.example.skill.notes'] }));`,
      `print(await ops[${name(AddNote)}]({ text: 'remember the docs' }));`,
    ],
  },
  {
    name: 'effect',
    dialect: EffectDialect,
    querySkillsCall: `yield* Database.resolve('${key(QuerySkills)}')`,
    steps: [
      `const Query = yield* Database.resolve('${key(QueryOperations)}');\n` +
        "yield* print(yield* Operation.invoke(Query, { query: 'urgency' }));",
      `const Score = yield* Database.resolve('${key(Score)}');\n` +
        "yield* print(yield* Operation.invoke(Score, { title: 'Write the docs' }));\n" +
        `const Enable = yield* Database.resolve('${key(EnableSkills)}');\n` +
        "yield* print(yield* Operation.invoke(Enable, { keys: ['com.example.skill.notes'] }));",
      `const AddNote = yield* Database.resolve('${key(AddNote)}');\n` +
        "yield* print(yield* Operation.invoke(AddNote, { text: 'remember the docs' }));",
    ],
  },
];

describe('code mode discovers through the Skill Manager', () => {
  describe.each(SCENARIOS)('$name dialect', ({ dialect, steps, querySkillsCall }) => {
    /** The system prompt of every model call. */
    const systems: string[] = [];

    it.effect(
      'states only the Skill Manager, and the model finds, enables and calls the rest from code',
      Effect.fnUntraced(
        function* (_) {
          scored.length = 0;
          noted.length = 0;
          const session = yield* AgentService.createSession({ skills: [ScoreSkill] });
          yield* session.submitPrompt('Score "Write the docs", then note it.');
          yield* session.waitForCompletion();

          expect(systems).toHaveLength(steps.length + 1);
          for (const system of systems) {
            expect(system).toContain('Nothing about this workspace is listed in this prompt');
            expect(system).toContain(querySkillsCall);
            // No other skill's instructions, no operation but the Skill Manager's, and no types.
            expect(system).not.toContain('Score titles before ranking them');
            expect(system).not.toContain('Write notes in lower case');
            expect(system).not.toContain('Scores a title for urgency');
            expect(system).not.toContain('com.example.type.ticket');
          }

          const messages = yield* TrajectoryStore.history(session.feed);
          const results = messages
            .flatMap((message) => message.blocks)
            .filter((block): block is ContentBlock.ToolResult => block._tag === 'toolResult');
          expect(results.map(({ name, error }) => ({ name, error }))).toEqual(
            steps.map(() => ({ name: EVAL_TOOL_NAME, error: undefined })),
          );
          expect(JSON.stringify(results[0].result)).toContain('com.example.operation.score');
          expect(scored).toEqual(['Write the docs']);
          // Callable on the model call after the one that enabled its skill.
          expect(noted).toEqual(['remember the docs']);
        },
        Effect.provide(
          AssistantTestLayer({
            types: [Ticket, Feed.Feed, Skill.Skill],
            operationHandlers: [SkillManagerSkill.Handlers, handlers],
            skills: [ScoreSkill, NotesSkill],
            agent: { makeTurnProducer: makeCodeModeTurnProducer({ dialect }) },
            aiService: scriptedAiService((request, index) => {
              systems.push(request.system);
              const code = steps[index];
              return code === undefined
                ? { parts: [text('Scored and noted.')] }
                : { parts: [toolCall(EVAL_TOOL_NAME, { code })] };
            }),
          }),
        ),
        TestHelpers.provideTestContext,
      ),
      { timeout: 30_000 },
    );
  });
});
