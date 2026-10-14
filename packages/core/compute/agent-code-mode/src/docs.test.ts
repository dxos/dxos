//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { callTool } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { type Database, Feed, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './eval-tool.ts';
import * as Sandbox from './Sandbox.ts';

/**
 * Every snippet `DOCS` shows the model, run through the Effect dialect against a real database:
 * a doc that names an API which does not exist, or does not behave as described, costs the model a
 * call, so the docs are tested like code.
 */

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.String,
    priority: Schema.optional(Schema.Number),
    tags: Schema.optional(Schema.Array(Schema.String)),
    owner: Schema.optional(Ref.Ref(Person)),
  }),
) {}

class Project extends Type.makeObject<Project>(DXN.make('com.example.type.project', '0.1.0'))(
  Schema.Struct({ name: Schema.String, tasks: Schema.Array(Ref.Ref(Task)) }),
) {}

class Assigned extends Type.makeRelation<Assigned>(DXN.make('com.example.relation.assigned', '0.1.0'))({
  source: Person,
  target: Task,
})(Schema.Struct({ role: Schema.optional(Schema.String) })) {}

class ScoreFailed extends Schema.TaggedError<ScoreFailed>('ScoreFailed')('ScoreFailed', {
  title: Schema.String,
}) {}

/** Scores a title by its length, and fails on an empty one: the operation `operations.md` is written against. */
const Score = Operation.make({
  meta: { key: DXN.make('com.example.operation.score'), name: 'Score' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(
  Score.pipe(
    Operation.withHandler(({ title }) =>
      title.length === 0 ? Effect.fail(new ScoreFailed({ title })) : Effect.succeed(title.length),
    ),
  ),
);

const TestLayer = AssistantTestLayer({
  types: [Person, Task, Project, Assigned, Feed.Feed],
  operationHandlers: [handlers],
});

/** Runs `code` through the eval tool as a turn would, failing the test if the code failed. */
const run = Effect.fnUntraced(function* (code: string) {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  const toolkit = makeEvalToolkit({
    dialect: EffectDialect,
    sandbox: Sandbox.inProcess,
    runtime,
    operations: [{ name: 'score', parameters: {}, definition: Score, invoke: () => Effect.void }],
  });
  const result = yield* callTool(yield* toolkit.handlers, {
    _tag: 'toolCall',
    toolCallId: 'docs',
    name: EVAL_TOOL_NAME,
    input: JSON.stringify({ code }),
    providerExecuted: false,
  });
  expect(result.error).toBeUndefined();
  return Schema.decodeUnknownSync(Schema.String)(JSON.parse(String(result.result)));
});

/** The objects every snippet below is written against, under the names the docs give them. */
const SETUP = `
  const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
  const Person = yield* Database.resolve('dxn:com.example.type.person:0.1.0');
  const Project = yield* Database.resolve('dxn:com.example.type.project:0.1.0');
  const Assigned = yield* Database.resolve('dxn:com.example.relation.assigned:0.1.0');
  const ada = yield* Database.add(Obj.make(Person, { name: 'Ada' }));
  const grace = yield* Database.add(Obj.make(Person, { name: 'Grace' }));
  const task = yield* Database.add(Obj.make(Task, { title: 'Write', status: 'open', priority: 5, tags: ['urgent'], owner: Ref.make(ada) }));
  const other = yield* Database.add(Obj.make(Task, { title: 'Ship', status: 'blocked', priority: 2, owner: Ref.make(grace) }));
  yield* Database.add(Obj.make(Task, { title: 'Done', status: 'done', priority: 1 }));
  const project = yield* Database.add(Obj.make(Project, { name: 'Launch', tasks: [] }));
  yield* Database.flush();
`;

describe('DOCS', () => {
  it.effect(
    'database.md: create, update, refs, relations and parents',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(`
          ${SETUP}
          const created = yield* Database.add(Obj.make(Task, { title: 'New', status: 'open' }));
          Obj.update(created, (task) => { task.status = 'done'; });
          const owner = yield* Database.load(task.owner);
          yield* Database.add(Relation.make(Assigned, { [Relation.Source]: ada, [Relation.Target]: task, role: 'reviewer' }));
          Obj.setParent(task, project);
          yield* Database.remove(created);
          yield* Database.flush();
          yield* print(owner.name, Obj.getParent(task)?.name);
        `);
        expect(output).toEqual('Ada Launch');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queries.md: filters, combinators, ordering and limits',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(`
          ${SETUP}
          const count = (rows) => rows.length;
          yield* print('open', count(yield* Database.query(Filter.type(Task, { status: 'open' })).run));
          yield* print('gt', count(yield* Database.query(Filter.type(Task, { priority: Filter.gt(3) })).run));
          yield* print('between', count(yield* Database.query(Filter.type(Task, { priority: Filter.between(1, 5) })).run));
          yield* print('contains', count(yield* Database.query(Filter.type(Task, { tags: Filter.contains('urgent') })).run));
          const [byId] = yield* Database.query(Filter.id(task.id)).run;
          yield* print('id', byId.title);
          yield* print('or', count(yield* Database.query(Filter.type(Task, { status: Filter.or(Filter.eq('open'), Filter.eq('blocked')) })).run));
          yield* print('not', count(yield* Database.query(Filter.and(Filter.type(Task), Filter.not(Filter.type(Task, { status: 'done' })))).run));
          const top = yield* Database.query(Query.select(Filter.type(Task)).orderBy(Order.property('priority', 'desc')).limit(2)).run;
          yield* print('top', top.map((task) => task.title).join(','));
          const skipped = yield* Database.query(Query.select(Filter.type(Task)).orderBy(Order.natural()).skip(1)).run;
          yield* print('skip', skipped.length);
        `);
        expect(output.split('\n')).toEqual([
          'open 1',
          'gt 1',
          'between 3',
          'contains 1',
          'id Write',
          'or 2',
          'not 2',
          'top Write,Ship',
          'skip 2',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'queries.md: references, relations, parents and children',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(`
          ${SETUP}
          yield* Database.add(Relation.make(Assigned, { [Relation.Source]: ada, [Relation.Target]: other, role: 'reviewer' }));
          Obj.setParent(task, project);
          yield* Database.flush();

          const owners = yield* Database.query(Query.select(Filter.type(Task, { status: 'open' })).reference('owner')).run;
          yield* print('owners', owners.map((person) => person.name).join(','));
          const adasTasks = yield* Database.query(Query.select(Filter.type(Person, { name: 'Ada' })).referencedBy(Task, 'owner')).run;
          yield* print('referencedBy', adasTasks.map((task) => task.title).join(','));

          const assigned = yield* Database.query(Query.select(Filter.id(ada.id)).sourceOf(Assigned)).run;
          yield* print('sourceOf', assigned.map((relation) => relation.role).join(','));
          const tasks = yield* Database.query(Query.select(Filter.id(ada.id)).sourceOf(Assigned).target()).run;
          yield* print('target', tasks.map((task) => task.title).join(','));
          const reviewers = yield* Database.query(Query.select(Filter.id(ada.id)).sourceOf(Assigned, { role: 'reviewer' })).run;
          yield* print('narrowed', reviewers.length, Relation.getTarget(reviewers[0]).title, Relation.getSource(reviewers[0]).name);
          const assignees = yield* Database.query(Query.select(Filter.id(other.id)).targetOf(Assigned).source()).run;
          yield* print('source', assignees.map((person) => person.name).join(','));

          const children = yield* Database.query(Query.select(Filter.id(project.id)).children()).run;
          yield* print('children', children.length);
          const tasksOf = yield* Database.query(Filter.and(Filter.type(Task), Filter.childOf(project))).run;
          yield* print('childOf', tasksOf.map((task) => task.title).join(','));
          const roots = yield* Database.query(Filter.and(Filter.type(Task), Filter.hasParent(false))).run;
          yield* print('roots', roots.length);
        `);
        expect(output.split('\n')).toEqual([
          'owners Ada',
          'referencedBy Write',
          'sourceOf reviewer',
          'target Ship',
          'narrowed 1 Ship Ada',
          'source Ada',
          'children 1',
          'childOf Write',
          'roots 2',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'operations.md and errors.md: Effect.exit contains a failed operation',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(`
          const Score = yield* Database.resolve('dxn:com.example.operation.score');
          for (const title of ['Write the docs', '']) {
            const exit = yield* Effect.exit(Operation.invoke(Score, { title }));
            if (exit._tag === 'Failure') {
              yield* print('failed', String(exit.cause).includes('ScoreFailed'));
            } else {
              yield* print('score', exit.value);
            }
          }
        `);
        expect(output).toEqual('score 14\nfailed true');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'README.md: the grep recipe finds lines across files',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* run(`
          const grep = (pattern) =>
            Object.entries(DOCS).flatMap(([file, text]) =>
              text.split('\\n').flatMap((line, index) => (pattern.test(line) ? [\`\${file}:\${index + 1}: \${line}\`] : [])),
            );
          yield* print(grep(/Relation\\.make|sourceOf/).length > 0, grep(/Relation\\.make/)[0].split(':')[0]);
        `);
        expect(output).toEqual('true database.md');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
