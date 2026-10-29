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
import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Feed, Obj, Ref, Relation, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { formatValue } from './describe.ts';
import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { Dialect } from './Dialect.ts';
import { EVAL_TOOL_NAME, evaluate } from './eval-tool.ts';
import { makeCodeModeTurnProducer } from './producer.ts';
import * as Sandbox from './Sandbox.ts';

EntityId.dangerouslyDisableRandomness();

const SKILL_KEY = 'com.example.skill.planning';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    owner: Schema.optional(Ref.Ref(Person)),
  }).pipe(Annotation.LabelAnnotation.set(['title'])),
) {}

class Feature extends Type.makeObject<Feature>(DXN.make('com.example.type.feature', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    dueAt: Schema.optional(Schema.String).annotate({ title: 'Due date' }),
    notes: Schema.optional(Schema.String),
    internal: Schema.optional(Schema.String).pipe(Annotation.FormInputAnnotation.set(false)),
    tasks: Schema.Array(Ref.Ref(Task)).pipe(Annotation.SetParent.set()),
    lead: Schema.optional(Ref.Ref(Person)),
    watchers: Schema.optional(Schema.Array(Ref.Ref(Person))).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(Annotation.LabelAnnotation.set(['name']), Skill.SkillsAnnotation.set([SKILL_KEY])),
) {}

class Implements extends Type.makeRelation<Implements>(DXN.make('com.example.relation.implements', '0.1.0'))({
  source: Task,
  target: Feature,
})(Schema.Struct({})) {}

const IMPLEMENTS_DXN = 'dxn:com.example.relation.implements:0.1.0';

const TYPES = [Person, Task, Feature, Implements, Feed.Feed, Skill.Skill];

const TestLayer = AssistantTestLayer({ types: TYPES });

/** The text of the last tool result the model was shown. */
const lastToolResult = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): string => {
  const results = prompt.content.flatMap((message) =>
    message.role === 'tool'
      ? message.content.flatMap((part) => (part.type === 'tool-result' ? [part.result] : []))
      : [],
  );
  const result = results.at(-1);
  return typeof result === 'string' ? result : JSON.stringify(result);
};

/** The last tool result each scripted turn was shown, by turn. */
const shown: string[] = [];

/** Ids the seeded objects are created with, read by the script below once the session runs. */
const seeded: { feature?: string } = {};

/** A feature with a lead, twelve owned tasks, a long note, and one task implementing it through a relation. */
const seed = Effect.fnUntraced(function* () {
  const ada = yield* Database.add(Obj.make(Person, { name: 'Ada' }));
  const tasks: Task[] = [];
  for (let index = 0; index < 12; index++) {
    tasks.push(yield* Database.add(Obj.make(Task, { title: `Task ${index}`, owner: Ref.make(ada) })));
  }
  const feature = yield* Database.add(
    Obj.make(Feature, {
      name: 'Login flow',
      dueAt: '2026-12-01',
      notes: 'x'.repeat(500),
      internal: 'plumbing',
      tasks: tasks.map((task) => Ref.make(task)),
      lead: Ref.make(ada),
      watchers: [Ref.make(ada)],
    }),
  );
  const implementer = yield* Database.add(Obj.make(Task, { title: 'Implementer' }));
  yield* Database.add(Relation.make(Implements, { [Relation.Source]: implementer, [Relation.Target]: feature }));
  yield* Database.flush();
  return { ada, tasks, feature, implementer };
});

/** Runs `code` exactly as the eval tool does, returning what it printed. */
const run = Effect.fnUntraced(function* (code: string, dialect: Dialect, skills: readonly string[] = []) {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  return yield* evaluate({ code, dialect, sandbox: Sandbox.inProcess, runtime, operations: [], skills });
});

describe('describe', () => {
  it.effect(
    'prints an object as a card that follows its schema',
    Effect.fnUntraced(
      function* (_) {
        const { feature, ada } = yield* seed();
        const card = formatValue(feature);
        const lines = card.split('\n');

        expect(lines[0]).toEqual(`com.example.type.feature ${feature.id} "Login flow"`);
        expect(card).toContain('  name: "Login flow"');
        // The schema's title is shown where it says more than the field name.
        expect(card).toContain('  dueAt (Due date): "2026-12-01"');
        expect(card).toContain(`  notes: "${'x'.repeat(200)}...[+300 chars]"`);
        // A field hidden from forms is named, not shown.
        expect(card).not.toContain('plumbing');
        expect(card).toContain('  hidden fields: internal');
        // Hidden or not, a field of refs is structure the model needs.
        expect(card).toContain(`  watchers: -> com.example.type.person ×1 [${ada.id} "Ada"]`);
        expect(card).toContain(`  lead: -> com.example.type.person ${ada.id} "Ada"`);
        // A ref list names its shared type once, then the first ten targets.
        expect(card).toMatch(/ {2}tasks: -> com\.example\.type\.task ×12 \[\w+ "Task 0", /);
        expect(card).toContain('"Task 9", ... 2 more]');
        expect(card).not.toContain('"Task 10"');
        // Refs are never printed as their wire envelope.
        expect(card).not.toContain('{"/":');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "names an owned object's parent",
    Effect.fnUntraced(
      function* (_) {
        const { feature, tasks } = yield* seed();
        expect(formatValue(tasks[0])).toContain(`  parent: -> com.example.type.feature ${feature.id} "Login flow"`);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'prints a relation with its endpoints',
    Effect.fnUntraced(
      function* (_) {
        const { implementer, feature } = yield* seed();
        const output = yield* run(
          `const [relation] = yield* Database.query(Query.select(Filter.id('${feature.id}')).targetOf('${IMPLEMENTS_DXN}')).run;
           yield* print(relation);`,
          EffectDialect,
        );
        expect(output).toContain(`  source: -> com.example.type.task ${implementer.id} "Implementer"`);
        expect(output).toContain(`  target: -> com.example.type.feature ${feature.id} "Login flow"`);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'appends relations, children and referrers, each with code that fetches exactly what it counts',
    Effect.fnUntraced(
      function* (_) {
        const { feature, ada } = yield* seed();
        const output = yield* run(
          `yield* print((yield* Database.query(Filter.id('${feature.id}')).run)[0]);`,
          EffectDialect,
        );

        expect(output).toContain('  relations: in: implements ×1');
        expect(output).toContain('  children: task ×12');
        expect(output).toContain(
          `yield* Database.query(Query.select(Filter.id('${feature.id}')).targetOf('${IMPLEMENTS_DXN}')).run  // 1 in implements`,
        );

        const person = yield* run(
          `yield* print((yield* Database.query(Filter.id('${ada.id}')).run)[0]);`,
          EffectDialect,
        );
        expect(person).toContain('  referenced by: task.owner ×12, feature.lead ×1, feature.watchers ×1');

        // Every fetch line is real code: run each and check it returns the count it was shown with.
        for (const text of [output, person]) {
          const fetches = text
            .split('\n')
            .filter((line) => line.startsWith('    yield*'))
            .map((line) => /^ {4}(.*) {2}\/\/ (\d+)/.exec(line));
          expect(fetches.length).toBeGreaterThan(0);
          for (const match of fetches) {
            expect(match).not.toBeNull();
            const [, code, count] = match ?? [];
            expect(
              yield* run(`yield* print((${code.replace(/^yield\* /, 'yield* ')}).length);`, EffectDialect),
            ).toEqual(count);
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'stops exploring past five objects in one call',
    Effect.fnUntraced(
      function* (_) {
        yield* seed();
        const output = yield* run(
          `for (const task of yield* Database.query(Filter.type(yield* Database.resolve('dxn:com.example.type.task:0.1.0'))).run) { yield* print(task); }`,
          EffectDialect,
        );
        expect(output.match(/^ {2}relations: /gm)).toHaveLength(5);
        expect(output.match(/relations not counted past 5 objects/g)).toHaveLength(8);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an unsaved object does not spend the exploration budget',
    Effect.fnUntraced(
      function* (_) {
        const { feature } = yield* seed();
        const output = yield* run(
          `const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
           for (let index = 0; index < 6; index++) { yield* print(Obj.make(Task, { title: 'Draft ' + index })); }
           yield* print((yield* Database.query(Filter.id('${feature.id}')).run)[0]);`,
          EffectDialect,
        );
        expect(output).not.toContain('relations not counted');
        expect(output).toContain('  children: task ×12');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'marks counts as lower bounds once the exploration query hits its cap',
    Effect.fnUntraced(
      function* (_) {
        const { ada } = yield* seed();
        for (let index = 0; index < 20; index++) {
          yield* Database.add(Obj.make(Task, { title: `Extra ${index}`, owner: Ref.make(ada) }));
        }
        yield* Database.flush();
        const output = yield* run(
          `yield* print((yield* Database.query(Filter.id('${ada.id}')).run)[0]);`,
          EffectDialect,
        );
        // 34 referrers in all; the hint only has to say there are many, and how to fetch them.
        expect(output).toMatch(/ {2}referenced by: task\.owner ×\d+\+/);
        expect(output).toContain(`referencedBy('dxn:com.example.type.task:0.1.0', 'owner')).run  // `);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'names the skills a type declares that the conversation has not bound',
    Effect.fnUntraced(
      function* (_) {
        const { feature } = yield* seed();
        const code = `yield* print((yield* Database.query(Filter.id('${feature.id}')).run)[0]);`;
        expect(yield* run(code, EffectDialect, [])).toContain(
          `  skills for this type: ${SKILL_KEY} (not enabled in this conversation)`,
        );
        expect(yield* run(code, EffectDialect, [SKILL_KEY])).toContain(`  skills for this type: ${SKILL_KEY}\n`);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the plain dialect describes on request and its hint calls fetch what they count',
    Effect.fnUntraced(
      function* (_) {
        const { feature, ada } = yield* seed();
        const output = yield* run(
          `const [feature] = await query('com.example.type.feature');
           print(await describe(feature));
           print((await relations(feature, 'in', '${IMPLEMENTS_DXN}')).length, (await children(feature)).length);
           print((await referrers('${ada.id}', 'com.example.type.task', 'owner')).length);`,
          PlainDialect,
        );
        expect(output).toContain(`await relations('${feature.id}', 'in', '${IMPLEMENTS_DXN}')  // 1 in implements`);
        expect(output).toContain(`await children('${feature.id}')  // 12 children`);
        expect(output.split('\n').slice(-2)).toEqual(['1 12', '12']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'prints an Effect Result, Exit and Option by their real fields',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(
          `yield* print(yield* Effect.result(Effect.succeed({ a: 1 })));
           yield* print(yield* Effect.result(Effect.fail(new Error('nope'))));
           yield* print(yield* Effect.exit(Effect.die('boom')));
           yield* print(yield* Database.query(Filter.id('${EntityId.random()}')).first);`,
          EffectDialect,
        );
        expect(output).toContain('"_tag": "Success",\n  "success": {\n    "a": 1');
        expect(output).not.toContain('"value": {');
        expect(output).toContain('"failure": {\n    "error": "Error",\n    "message": "nope"');
        expect(output).toContain('"cause": "Error: boom');
        expect(output).toContain('{\n  "_tag": "None"\n}');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // The loop the printer exists for: the model prints the object it was asked about, learns from the card that
  // tasks implement it through a relation it could not otherwise see, and pastes the fetch line it was given.
  it.effect(
    "a code-mode turn finds an object's relations from its printed card",
    Effect.fnUntraced(
      function* (_) {
        const { feature } = yield* seed();
        seeded.feature = feature.id;
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('Which tasks implement the login feature?');
        yield* session.waitForCompletion();

        expect(shown[1]).toContain('  relations: in: implements ×1');
        expect(shown[2]).toEqual('Implementer');
      },
      Effect.provide(
        AssistantTestLayer({
          types: TYPES,
          aiService: ScriptedLanguageModel.scriptedAiService((request, index) => {
            shown[index] = lastToolResult(request);
            switch (index) {
              case 0:
                return {
                  parts: [
                    ScriptedLanguageModel.toolCall(EVAL_TOOL_NAME, () => ({
                      code: `yield* print((yield* Database.query(Filter.id('${seeded.feature}')).run)[0]);`,
                    })),
                  ],
                };
              case 1: {
                const fetch = /^ {4}(yield\* .*targetOf.*) {2}\/\//m.exec(shown[1])?.[1];
                return {
                  parts: [
                    ScriptedLanguageModel.toolCall(EVAL_TOOL_NAME, {
                      code: `const relations = ${fetch}; yield* print(relations.map((relation) => Relation.getSource(relation).title).join(', '));`,
                    }),
                  ],
                };
              }
              default:
                return { parts: [ScriptedLanguageModel.text('The Implementer task implements it.')] };
            }
          }),
          agent: { makeTurnProducer: makeCodeModeTurnProducer({ dialect: EffectDialect }) },
        }),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it('cuts long arrays and strings inside JSON with a marker', () => {
    const printed = formatValue({ items: Array.from({ length: 15 }, (_, index) => index), text: 'y'.repeat(250) });
    expect(printed).toContain('"... 5 more items"');
    expect(printed).toContain(`"${'y'.repeat(200)}...[+50 chars]"`);
    // A top-level string is what the model asked to read, so it is never cut.
    expect(formatValue('z'.repeat(1000))).toHaveLength(1000);
  });
});
