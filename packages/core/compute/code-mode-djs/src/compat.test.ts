//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { type CompatCase, runCase } from './testing/compare.ts';
import { PROJECT_DXN, TASK_DXN } from './testing/fixtures.ts';

EntityId.dangerouslyDisableRandomness();

const SCORE = 'dxn:com.example.operation.score';
const COMPLETE = 'dxn:com.example.operation.complete';

/**
 * The Effect dialect's surface, one program per row: what the in-process sandbox prints and leaves in
 * the database, djs must print and leave too. Drawn from the dialect's own tests and docs.
 */
export const CASES: readonly CompatCase[] = [
  {
    name: 'reads, writes and invokes operations through the ECHO API',
    source: 'agent-code-mode code-mode.test.ts',
    programs: [
      `const tasks = yield* Database.query(Filter.type((yield* Database.resolve('${TASK_DXN}')), { status: 'open' })).run;
       yield* print('open', tasks.length);
       for (const task of tasks) {
         Obj.update(task, (task) => { task.priority = task.title.length; });
       }
       const created = yield* Database.add(Obj.make((yield* Database.resolve('${TASK_DXN}')), { title: 'Review the PR', status: 'open' }));
       yield* Database.flush();
       yield* print('created', created.title);
       yield* print('scored', yield* Operation.invoke((yield* Database.resolve('${SCORE}')), { title: created.title }));`,
    ],
  },
  {
    name: 'resolves an object by its legacy ECHO DXN as by its URI',
    source: 'agent-code-mode code-mode.test.ts',
    programs: [
      `yield* print((yield* Database.resolve('{{legacy:0}}')).title, (yield* Database.resolve('{{uri:0}}')).title);`,
    ],
  },
  {
    name: 'a failing effect fails the call after its output',
    source: 'agent-code-mode code-mode.test.ts',
    programs: [
      `class ProbeError extends Error {}
       yield* print('before');
       yield* Effect.fail(new ProbeError('nope'));`,
    ],
  },
  {
    name: 'print without yield* says why nothing came back',
    source: 'agent-code-mode code-mode.test.ts',
    programs: ["print('hello');", "yield* print('hello');"],
  },
  {
    name: 'DOCS is a plain object of markdown',
    source: 'agent-code-mode code-mode.test.ts',
    programs: ["yield* print(Object.keys(DOCS).join(',')); yield* print(DOCS['README.md'].slice(0, 28));"],
  },
  {
    name: "the README's recipe lists every key from the catalog",
    source: 'agent-code-mode code-mode.test.ts',
    programs: [
      `const typeKeys = DOCS['catalog/types.md'].match(/dxn:[^\\s\`]+/g);
       const operationKeys = DOCS['catalog/operations.md'].match(/dxn:[^\\s\`']+/g) ?? [];
       yield* print(typeKeys.includes('${TASK_DXN}'), operationKeys.join(','));
       const Score = yield* Database.resolve(operationKeys[0]);
       yield* print('scored', yield* Operation.invoke(Score, { title: 'abc' }));`,
    ],
  },
  {
    name: 'an object prints as a card with its relations and referrers',
    source: 'agent-code-mode docs/printing.md',
    programs: [
      `const [task] = yield* Database.query(Filter.id('{{id:1}}')).run;
       yield* print(task);
       const [project] = yield* Database.query(Filter.id('{{project}}')).run;
       yield* print(project);`,
    ],
  },
  {
    name: 'a value the program returns is shown when it printed nothing',
    programs: [
      "return { answer: 42, items: ['a', 'b'] };",
      'return (yield* Database.query(Filter.everything()).run).length;',
    ],
  },
  {
    name: 'refs load, and a new object takes a ref to one it holds',
    source: 'agent-code-mode docs/database.md',
    programs: [
      `const [task] = yield* Database.query(Filter.id('{{id:0}}')).run;
       const project = yield* Database.load(task.project);
       yield* print(project.name);
       const Task = yield* Database.resolve('${TASK_DXN}');
       const created = yield* Database.add(Obj.make(Task, { title: 'Plan', status: 'open', project: Ref.make(project) }));
       yield* Database.flush();
       const again = yield* Database.load(created.project);
       yield* print(again.name, created.project.target?.name);`,
    ],
  },
  {
    name: 'traversals: references, relations and ordering',
    source: 'agent-code-mode docs/queries.md',
    programs: [
      `const Task = yield* Database.resolve('${TASK_DXN}');
       const referrers = yield* Database.query(Query.select(Filter.id('{{project}}')).referencedBy('${TASK_DXN}', 'project')).run;
       yield* print('referrers', referrers.map((task) => task.title).sort().join(', '));
       const ordered = yield* Database.query(Query.select(Filter.type(Task)).orderBy(Order.property('title', 'asc'))).run;
       yield* print('ordered', ordered.map((task) => task.title).join(' < '));
       const limited = yield* Database.query(Query.select(Filter.type(Task)).orderBy(Order.property('title', 'desc')).limit(2)).run;
       yield* print('limited', limited.map((task) => task.title).join(', '));
       const blocking = yield* Database.query(Query.select(Filter.id('{{id:2}}')).sourceOf('dxn:com.example.type.dependsOn:0.1.0').target()).run;
       yield* print('depends on', blocking.map((task) => task.title).join(', '));`,
    ],
  },
  {
    name: 'filters: comparisons, tags, contains and not',
    source: 'agent-code-mode docs/queries.md',
    programs: [
      `const Task = yield* Database.resolve('${TASK_DXN}');
       const urgent = yield* Database.query(Filter.type(Task, { priority: Filter.gt(3) })).run;
       yield* print('urgent', urgent.map((task) => task.title).join(', '));
       const notDone = yield* Database.query(Filter.and(Filter.type(Task), Filter.not(Filter.type(Task, { status: 'done' })))).run;
       yield* print('not done', notDone.length);
       const docs = yield* Database.query(Filter.type(Task, { tags: Filter.contains('docs') })).run;
       yield* print('docs', docs.map((task) => task.title).join(', '));`,
    ],
  },
  {
    name: 'an operation takes a ref and returns an object',
    programs: [
      `const Complete = yield* Database.resolve('${COMPLETE}');
       const [task] = yield* Database.query(Filter.id('{{id:1}}')).run;
       const { task: done } = yield* Operation.invoke(Complete, { task: Ref.make(task) });
       yield* print(done.title, done.status, task.status);`,
    ],
  },
  {
    // In-process rejects the object; djs makes the reference, as the worker sandbox does.
    name: 'an object passed where the schema takes a ref arrives as a ref',
    expect: 'ok',
    programs: [
      `const Complete = yield* Database.resolve('${COMPLETE}');
       const [task] = yield* Database.query(Filter.id('{{id:1}}')).run;
       const { task: done } = yield* Operation.invoke(Complete, { task });
       yield* print(done.status, task.status);`,
    ],
  },
  {
    // The test clock holds the in-process sleep forever; djs sleeps on the host's clock.
    name: 'Effect.sleep waits on the host',
    expect: 'ok',
    programs: ["yield* print('a'); yield* Effect.sleep('5 millis'); yield* print('b');"],
  },
  {
    name: 'a tool with no operation is called through Tools',
    programs: ["yield* print(yield* Tools['echo_upper']({ text: 'shout' }));"],
  },
  {
    name: 'removing an object',
    programs: [
      `const [task] = yield* Database.query(Filter.id('{{id:2}}')).run;
       yield* Database.remove(task);
       yield* Database.flush();
       const Task = yield* Database.resolve('${TASK_DXN}');
       yield* print((yield* Database.query(Filter.type(Task)).run).length);`,
    ],
  },
  {
    name: 'errors the program contains do not fail the call',
    source: 'agent-code-mode docs/errors.md',
    programs: [
      `const missing = yield* Database.resolve('dxn:com.example.type.missing:0.1.0').pipe(
         Effect.map(() => 'found'),
         Effect.catch(() => Effect.succeed('missing')),
       );
       yield* print(missing);
       const outcome = yield* Effect.result(Effect.fail('soft'));
       yield* print(outcome._tag);`,
    ],
  },
  {
    name: 'a thrown string fails the call with that string',
    programs: ["yield* print('before'); throw 'oops';"],
  },
  {
    name: 'plain JavaScript: dates, JSON, Math, Map and array helpers',
    programs: [
      `const groups = new Map();
       for (const word of ['b', 'a', 'b', 'c']) groups.set(word, (groups.get(word) ?? 0) + 1);
       yield* print(JSON.stringify(Object.fromEntries([...groups].sort())), Math.max(...groups.values()));
       yield* print(new Date(Date.UTC(2026, 0, 2)).toISOString().slice(0, 10), [3, 1, 2].toSorted().join(''));`,
    ],
  },
  {
    name: 'Effect combinators in a program',
    programs: [
      `const Task = yield* Database.resolve('${TASK_DXN}');
       const tasks = yield* Database.query(Filter.type(Task)).run;
       const Score = yield* Database.resolve('${SCORE}');
       const scores = yield* Effect.forEach(tasks, (task) => Operation.invoke(Score, { title: task.title }));
       const [a, b] = yield* Effect.all([Effect.succeed(1), Effect.sync(() => 2)]);
       yield* print(scores.sort((x, y) => x - y).join(','), a + b);`,
    ],
  },
  {
    name: 'a project is created with tasks that reference it',
    programs: [
      `const Project = yield* Database.resolve('${PROJECT_DXN}');
       const Task = yield* Database.resolve('${TASK_DXN}');
       const project = yield* Database.add(Obj.make(Project, { name: 'Next' }));
       for (const title of ['One', 'Two']) {
         yield* Database.add(Obj.make(Task, { title, status: 'open', project: Ref.make(project) }));
       }
       yield* Database.flush();
       const tasks = yield* Database.query(Query.select(Filter.id(project.id)).referencedBy('${TASK_DXN}', 'project')).run;
       yield* print(tasks.length, Obj.getLabel(project) ?? project.name);`,
    ],
  },
  {
    name: 'a syntax error fails the call',
    expect: 'fails',
    programs: ['const = ;'],
  },
  {
    name: 'a later program reads what an earlier one bound',
    expect: 'ok',
    programs: [
      `const Task = yield* Database.resolve('${TASK_DXN}');
       const open = yield* Database.query(Filter.type(Task, { status: 'open' })).run;
       yield* print(open.length);`,
      `for (const task of open) { Obj.update(task, (task) => { task.status = 'done'; }); }
       yield* Database.flush();
       yield* print((yield* Database.query(Filter.type(Task, { status: 'done' })).run).length);`,
    ],
  },
];

describe('Effect dialect compatibility', () => {
  for (const compat of CASES) {
    it.effect(
      compat.name,
      Effect.fnUntraced(function* (_) {
        const djs = yield* runCase(compat, 'djs');
        switch (compat.expect ?? 'same') {
          case 'same': {
            const reference = yield* runCase(compat, 'in-process');
            expect(djs).toEqual(reference);
            break;
          }
          case 'ok':
            expect(djs.results.map(({ ok }) => ok)).toEqual(compat.programs.map(() => true));
            break;
          case 'fails': {
            const reference = yield* runCase(compat, 'in-process');
            expect(reference.results.map(({ ok }) => ok)).toEqual(compat.programs.map(() => false));
            expect(djs.results.map(({ ok }) => ok)).toEqual(compat.programs.map(() => false));
            break;
          }
        }
      }, TestHelpers.provideTestContext),
    );
  }
});
