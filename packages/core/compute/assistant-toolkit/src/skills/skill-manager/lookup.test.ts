//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext, Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId, type URI } from '@dxos/keys';

import { QueryOperations, QuerySkills, QueryTypes } from './operations/definitions.ts';
import { SkillManagerHandlers } from './operations/index.ts';
import * as SkillManagerSkill from './SkillManagerSkill.ts';

EntityId.dangerouslyDisableRandomness();

class Ticket extends Type.makeObject<Ticket>(DXN.make('com.example.type.ticket', '0.1.0'))(
  Schema.Struct({ title: Schema.String, priority: Schema.optional(Schema.Number) }),
) {}

/** A field with five tagged variants, which a list of every type names by its tags alone. */
class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({
    block: Schema.Union(['a', 'b', 'c', 'd', 'e'].map((tag) => Schema.TaggedStruct(tag, { text: Schema.String }))),
  }),
) {}

const Score = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.score'),
    name: 'Score',
    description: 'Scores a title for urgency. Returns its length.',
  },
  input: Schema.Struct({ title: Schema.String, ticket: Schema.optional(Ref.Ref(Ticket)) }),
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
  Score.pipe(Operation.withHandler(({ title }) => Effect.succeed(title.length))),
  AddNote.pipe(Operation.withHandler(() => Effect.succeed('noted'))),
  Archive.pipe(Operation.withHandler(() => Effect.void)),
);

/** Enabled in the conversation below. */
const ScoreSkill = Skill.make({
  key: 'com.example.skill.score',
  name: 'Scoring',
  description: 'Scores titles.',
  instructions: Template.make({ source: 'Score titles before ranking them.' }),
  tools: Skill.toolDefinitions({ operations: [Score] }),
});

/** Not enabled, but an agent may enable it. */
const NotesSkill = Skill.make({
  key: 'com.example.skill.notes',
  name: 'Notes',
  description: 'Keeps a notebook.',
  instructions: Template.make({ source: 'Write notes in lower case.' }),
  tools: Skill.toolDefinitions({ operations: [AddNote] }),
  agentCanEnable: true,
});

/** Neither enabled nor enableable. */
const HiddenSkill = Skill.make({
  key: 'com.example.skill.hidden',
  name: 'Hidden',
  instructions: Template.make({ source: 'Never shown.' }),
  tools: Skill.toolDefinitions({ operations: [Archive] }),
});

/** A skill whose template cannot render: an operation input that names no operation is a defect. */
const BrokenSkill = Skill.make({
  key: 'com.example.skill.broken',
  name: 'Broken',
  instructions: Template.make({ source: '{{value}}', inputs: [{ name: 'value', kind: 'operation' }] }),
  agentCanEnable: true,
});

const TestLayer = AssistantTestLayer({
  operationHandlers: [SkillManagerHandlers, handlers],
  types: [Ticket, Note, Feed.Feed, Skill.Skill],
  skills: [ScoreSkill, NotesSkill, HiddenSkill, BrokenSkill],
});

class TestConversation extends Context.Service<TestConversation, { conversation: URI.URI }>()(
  '@dxos/assistant-toolkit/LookupTestConversation',
) {}

/** A conversation with Scoring enabled, as `enable-skills` would leave it. */
const ConversationLayer = Layer.unwrap(
  Effect.gen(function* () {
    const feed = yield* Database.add(Feed.make());
    const runtime = yield* Effect.context<Database.Service>();
    const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
    const scoring = yield* Skill.upsert('com.example.skill.score');
    yield* Effect.promise(() => binder.bind({ skills: [Ref.make(scoring)] }));
    return Layer.mergeAll(
      Layer.succeed(TestConversation, { conversation: Obj.getURI(feed) }),
      Layer.succeed(Harness.HarnessService, Harness.fromBinder({ feed, runtime, binder })),
    );
  }),
);

const provideTestLayers = Effect.provide(ConversationLayer.pipe(Layer.provideMerge(TestLayer)));

/** Keys as the registry may spell them, with or without `dxn:`. */
const bare = (key: string) => key.replace(/^dxn:/, '');

describe('Skill Manager lookups', () => {
  it.effect(
    'query-skills lists every skill, saying which are enabled here and which an agent may enable',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const rows = yield* Operation.invoke(QuerySkills, {}, { conversation });
        expect(rows.map(({ key, enabled, agentCanEnable }) => ({ key, enabled, agentCanEnable }))).toEqual([
          { key: 'com.example.skill.broken', enabled: false, agentCanEnable: true },
          { key: 'com.example.skill.hidden', enabled: false, agentCanEnable: false },
          { key: 'com.example.skill.notes', enabled: false, agentCanEnable: true },
          { key: 'com.example.skill.score', enabled: true, agentCanEnable: false },
        ]);
        expect(rows.every((row) => row.instructions === undefined && row.operations === undefined)).toBe(true);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "query-skills by key gives the skill's instructions and operations",
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const [notes] = yield* Operation.invoke(QuerySkills, { keys: ['com.example.skill.notes'] }, { conversation });
        expect(notes.instructions).toEqual('Write notes in lower case.');
        expect(notes.operations).toEqual([
          expect.objectContaining({
            tool: Operation.toolName(AddNote),
            name: 'Add note',
            description: 'Adds a note to the notebook.',
            skill: 'com.example.skill.notes',
            enabled: false,
          }),
        ]);
        expect(bare(notes.operations?.[0].key ?? '')).toEqual('com.example.operation.addNote');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query-operations searches the skills the agent can use, never a hidden one',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const query = (input: { query?: string; skill?: string }) =>
          Operation.invoke(QueryOperations, input, { conversation }).pipe(
            Effect.map((rows) => rows.map(({ key, skill, enabled }) => ({ key: bare(key), skill, enabled }))),
          );
        expect(yield* query({ query: 'urgency' })).toEqual([
          { key: 'com.example.operation.score', skill: 'com.example.skill.score', enabled: true },
        ]);
        expect(yield* query({ query: 'notebook' })).toEqual([
          { key: 'com.example.operation.addNote', skill: 'com.example.skill.notes', enabled: false },
        ]);
        expect(yield* query({ query: 'archive' })).toEqual([]);
        expect(yield* query({ skill: 'com.example.skill.notes' })).toEqual(yield* query({ query: 'notebook' }));

        // A list cuts a description to its first sentence; a lookup by key gives it whole.
        const [listed] = yield* Operation.invoke(QueryOperations, { query: 'urgency' }, { conversation });
        expect(listed.description).toEqual('Scores a title for urgency.');
        expect(listed.input).toBeUndefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "query-operations by key gives the operation's input, refs as Ref<typename>",
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const [score] = yield* Operation.invoke(
          QueryOperations,
          { keys: ['com.example.operation.score'] },
          { conversation },
        );
        expect(score.description).toEqual('Scores a title for urgency. Returns its length.');
        expect(score.input).toEqual('{ title: string, ticket?: Ref<com.example.type.ticket> }');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query-types searches the registered types and gives their fields on lookup',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        expect(yield* Operation.invoke(QueryTypes, { query: 'ticket' }, { conversation })).toEqual([
          {
            typename: 'com.example.type.ticket',
            dxn: String(DXN.make('com.example.type.ticket', '0.1.0')),
            kind: 'object',
          },
        ]);
        const [ticket] = yield* Operation.invoke(
          QueryTypes,
          { typenames: ['com.example.type.ticket'] },
          { conversation },
        );
        expect(ticket.fields).toEqual('title: string, priority?: number');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the tool-calling instructions list every skill and its flags; the code-mode ones list none',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const render = (skill: Skill.Skill) =>
          Template.processTemplate(skill.instructions).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );
        const listing = yield* render(SkillManagerSkill.make());
        expect(listing).toContain('- com.example.skill.score "Scoring" -- Scores titles. [enabled]');
        expect(listing).toContain('- com.example.skill.notes "Notes" -- Keeps a notebook. [agent-can-enable]');

        const codeMode = yield* render(SkillManagerSkill.makeForCodeMode());
        expect(codeMode).toContain('Nothing about this workspace is listed in this prompt');
        expect(codeMode).not.toContain('com.example.skill');
        expect(SkillManagerSkill.makeForCodeMode().tools).toEqual(SkillManagerSkill.make().tools);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query-skills by key still returns the other skills when one template cannot render',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const rows = yield* Operation.invoke(
          QuerySkills,
          { keys: ['com.example.skill.broken', 'com.example.skill.notes'] },
          { conversation },
        );
        expect(rows.map(({ key, instructions }) => ({ key, instructions }))).toEqual([
          { key: 'com.example.skill.broken', instructions: undefined },
          { key: 'com.example.skill.notes', instructions: 'Write notes in lower case.' },
        ]);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query-types by typename spells out every variant of a union, which a list names by its tags',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* TestConversation;
        const [note] = yield* Operation.invoke(QueryTypes, { typenames: ['com.example.type.note'] }, { conversation });
        expect(note.fields).toContain('{ _tag: "e", text: string }');
        expect(note.fields).not.toContain('…');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
  );
});
