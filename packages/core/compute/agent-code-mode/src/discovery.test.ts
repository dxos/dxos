//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { TrajectoryStore } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Filter, Registry, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { type ContentBlock } from '@dxos/types';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation } from './Dialect.ts';
import { LoadSkill, QueryOperations, QueryTypes, makeDiscovery, serveLocally } from './discovery.ts';
import { EVAL_TOOL_NAME, evaluate } from './eval-tool.ts';
import { describeTypes } from './fields.ts';
import { makeCodeModeTurnProducer } from './producer.ts';
import * as Sandbox from './Sandbox.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

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

const Archive = Operation.make({
  meta: { key: DXN.make('com.example.operation.archive'), name: 'Archive', description: 'Archives everything.' },
  input: Schema.Struct({}),
  output: Schema.Void,
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
  Archive.pipe(Operation.withHandler(() => Effect.void)),
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

/** Neither enabled nor enableable: the agent never sees it. */
const HiddenSkill = Skill.make({
  key: 'com.example.skill.hidden',
  name: 'Hidden',
  instructions: Template.make({ source: 'Never shown.' }),
  tools: Skill.toolDefinitions({ operations: [Archive] }),
});

const testLayerOptions = {
  types: [Ticket, Feed.Feed, Skill.Skill],
  operationHandlers: [handlers],
  skills: [ScoreSkill, NotesSkill, HiddenSkill],
};

/** Score as the enabled skill's projection would hand it to the sandbox. */
const scoreOperation: SandboxOperation = {
  name: Operation.toolName(Score),
  description: Score.meta.description,
  parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  definition: Score,
  invoke: () => Effect.succeed(0),
};

/** The Discovery skill over the test registry, with Scoring enabled; `enabled` collects the skills it enables. */
const discoveryFor = Effect.fnUntraced(function* (dialect: Dialect) {
  const services = yield* Effect.context<Database.Service | Registry.Service>();
  const enabled: string[] = [];
  const discovery = makeDiscovery({
    dialect,
    enabled: [ScoreSkill],
    operations: [scoreOperation],
    types: describeTypes(Context.get(services, Database.Service).db),
    catalog: Effect.all({
      skills: Registry.runQuery(Filter.type(Skill.Skill)),
      records: Registry.runQuery(Filter.type(Operation.PersistentOperation)),
    }).pipe(Effect.provide(services)),
    instructionsOf: (skill) => Effect.succeed(`Instructions of ${skill.name}.`),
    enable: (skill) =>
      Effect.sync(() => {
        enabled.push(Skill.getKey(skill));
      }),
  });
  const call = (definition: Operation.Definition.Any, input: unknown) =>
    Effect.gen(function* () {
      const operation = discovery.operations.find((candidate) => candidate.definition === definition);
      if (operation === undefined) {
        return yield* Effect.die(new Error(`No discovery operation ${String(definition.meta.key)}.`));
      }
      return yield* operation.invoke(input);
    });
  return { discovery, enabled, call };
});

describe('discovery', () => {
  it.effect(
    'loadSkill lists the enabled skills and those the agent may enable',
    Effect.fnUntraced(
      function* (_) {
        const { call } = yield* discoveryFor(PlainDialect);
        expect(yield* call(LoadSkill, {})).toEqual({
          skills: [
            { key: 'com.example.skill.score', name: 'Scoring', description: 'Scores titles.', enabled: true },
            { key: 'com.example.skill.notes', name: 'Notes', description: 'Keeps a notebook.', enabled: false },
          ],
        });
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'loadSkill returns a skill with its operations, enabling it only when it is not, and refuses one it may not use',
    Effect.fnUntraced(
      function* (_) {
        const { call, enabled } = yield* discoveryFor(PlainDialect);
        expect(yield* call(LoadSkill, { key: 'com.example.skill.score' })).toEqual({
          skill: {
            key: 'com.example.skill.score',
            name: 'Scoring',
            instructions: 'Instructions of Scoring.',
            operations: [
              {
                key: String(Score.meta.key),
                name: 'Score',
                description: 'Scores a title for urgency.',
                skill: 'com.example.skill.score',
                callable: true,
              },
            ],
          },
        });
        expect(enabled).toEqual([]);

        expect(yield* call(LoadSkill, { key: 'com.example.skill.notes' })).toEqual({
          skill: expect.objectContaining({
            key: 'com.example.skill.notes',
            instructions: 'Instructions of Notes.',
            operations: [
              expect.objectContaining({ name: 'Add note', skill: 'com.example.skill.notes', callable: false }),
            ],
            enabledNow: true,
          }),
        });
        expect(enabled).toEqual(['com.example.skill.notes']);

        const refused = yield* call(LoadSkill, { key: 'com.example.skill.hidden' }).pipe(Effect.exit);
        expect(Exit.isFailure(refused) && String(Cause.squash(refused.cause))).toContain(
          'No skill com.example.skill.hidden can be used here',
        );
        expect(enabled).toEqual(['com.example.skill.notes']);
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queryOperations searches what the agent can use, never its own operations or a hidden skill',
    Effect.fnUntraced(
      function* (_) {
        const { call } = yield* discoveryFor(PlainDialect);
        expect(yield* call(QueryOperations, { query: 'urgency' })).toEqual({
          operations: [
            {
              key: String(Score.meta.key),
              name: 'Score',
              description: 'Scores a title for urgency.',
              skill: 'com.example.skill.score',
              callable: true,
            },
          ],
        });
        expect(yield* call(QueryOperations, { query: 'notebook' })).toEqual({
          operations: [
            expect.objectContaining({ name: 'Add note', skill: 'com.example.skill.notes', callable: false }),
          ],
        });
        expect(yield* call(QueryOperations, { query: 'archive' })).toEqual({ operations: [] });

        const all = JSON.stringify(yield* call(QueryOperations, {}));
        expect(all).toContain('com.example.operation.score');
        expect(all).toContain('com.example.operation.addNote');
        expect(all).not.toContain('org.dxos.operation.discovery');
        expect(all).not.toContain('com.example.operation.archive');
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "queryOperations by key gives the operation's input and call, in the dialect's own form",
    Effect.fnUntraced(
      function* (_) {
        const plain = yield* discoveryFor(PlainDialect);
        expect(yield* plain.call(QueryOperations, { keys: [String(Score.meta.key)] })).toEqual({
          operations: [
            expect.objectContaining({
              description: 'Scores a title for urgency. Returns its length.',
              call: `await ops[${JSON.stringify(Operation.toolName(Score))}](input)`,
              input: JSON.stringify(scoreOperation.parameters),
            }),
          ],
        });

        const effect = yield* discoveryFor(EffectDialect);
        expect(yield* effect.call(QueryOperations, { keys: [String(Score.meta.key)] })).toEqual({
          operations: [
            expect.objectContaining({
              call: `yield* Database.resolve('${String(Score.meta.key)}')`,
              input: '{ title: string }',
            }),
          ],
        });
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queryTypes searches the registered types and gives their fields on lookup',
    Effect.fnUntraced(
      function* (_) {
        const { call } = yield* discoveryFor(PlainDialect);
        expect(yield* call(QueryTypes, { query: 'ticket' })).toEqual({
          types: [{ typename: 'com.example.type.ticket', dxn: expect.stringContaining('ticket'), kind: 'object' }],
        });
        expect(yield* call(QueryTypes, { typenames: ['com.example.type.ticket'] })).toEqual({
          types: [expect.objectContaining({ fields: 'title: string, priority?: number' })],
        });
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "both dialects call the skill's operations from code",
    Effect.fnUntraced(
      function* (_) {
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const run = Effect.fnUntraced(function* (dialect: Dialect, code: string) {
          const { discovery } = yield* discoveryFor(dialect);
          return yield* evaluate({
            code,
            dialect,
            sandbox: Sandbox.inProcess,
            runtime: Context.add(
              runtime,
              Operation.Service,
              serveLocally(Context.get(runtime, Operation.Service), discovery.operations),
            ),
            operations: [...discovery.operations, scoreOperation],
          });
        });

        expect(
          yield* run(
            PlainDialect,
            `print((await ops[${JSON.stringify(Operation.toolName(LoadSkill))}]()).skills.length);`,
          ),
        ).toEqual('2');
        expect(
          yield* run(
            EffectDialect,
            `const Load = yield* Database.resolve('${String(LoadSkill.meta.key)}');\n` +
              'const { skills } = yield* Operation.invoke(Load, {});\nyield* print(skills.length);',
          ),
        ).toEqual('2');
      },
      Effect.provide(AssistantTestLayer(testLayerOptions)),
      TestHelpers.provideTestContext,
    ),
  );
});

/** The turn's three eval calls in each dialect: find Score, run it and enable Notes, then run Notes' operation. */
const SCENARIOS = [
  {
    name: 'plain',
    dialect: PlainDialect,
    loadSkillCall: `await ops[${JSON.stringify(Operation.toolName(LoadSkill))}](input)`,
    steps: [
      `print(await ops[${JSON.stringify(Operation.toolName(QueryOperations))}]({ query: 'urgency' }));`,
      `print(await ops[${JSON.stringify(Operation.toolName(Score))}]({ title: 'Write the docs' }));\n` +
        `print(await ops[${JSON.stringify(Operation.toolName(LoadSkill))}]({ key: 'com.example.skill.notes' }));`,
      `print(await ops[${JSON.stringify(Operation.toolName(AddNote))}]({ text: 'remember the docs' }));`,
    ],
  },
  {
    name: 'effect',
    dialect: EffectDialect,
    loadSkillCall: `yield* Database.resolve('${String(LoadSkill.meta.key)}')`,
    steps: [
      `const Query = yield* Database.resolve('${String(QueryOperations.meta.key)}');\n` +
        "yield* print(yield* Operation.invoke(Query, { query: 'urgency' }));",
      `const Score = yield* Database.resolve('${String(Score.meta.key)}');\n` +
        "yield* print(yield* Operation.invoke(Score, { title: 'Write the docs' }));\n" +
        `const Load = yield* Database.resolve('${String(LoadSkill.meta.key)}');\n` +
        "yield* print(yield* Operation.invoke(Load, { key: 'com.example.skill.notes' }));",
      `const AddNote = yield* Database.resolve('${String(AddNote.meta.key)}');\n` +
        "yield* print(yield* Operation.invoke(AddNote, { text: 'remember the docs' }));",
    ],
  },
];

describe('discovery mode', () => {
  describe.each(SCENARIOS)('$name dialect', ({ dialect, steps, loadSkillCall }) => {
    /** The system prompt of every model call. */
    const systems: string[] = [];

    it.effect(
      'states only the Discovery skill, and the model finds, enables and calls the rest from code',
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
            expect(system).toContain(loadSkillCall);
            // No other skill's instructions, no operation but the skill's own, and no types.
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
            ...testLayerOptions,
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
