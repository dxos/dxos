//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Dialect, EffectDialect, Sandbox, type SandboxOperation, evaluate } from '@dxos/agent-code-mode';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { DjsEffectDialect } from '../dialect.ts';
import { Engine } from '../Engine.ts';
import { loadGuestBundle } from '../GuestBundle.ts';

export const TASK_TYPENAME = 'com.example.type.task';
export const TASK_DXN = String(DXN.make(TASK_TYPENAME, '0.1.0'));
export const PROJECT_DXN = String(DXN.make('com.example.type.project', '0.1.0'));

export class Project extends Type.makeObject<Project>(DXN.make('com.example.type.project', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotate({ description: 'Name of the project.' }),
  }),
) {}

export class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({
    title: Schema.String.annotate({ description: 'Short title of the task.' }),
    status: Schema.String.annotate({ description: 'One of "open" or "done".' }),
    priority: Schema.optional(Schema.Number).annotate({ description: 'Priority score, higher is more urgent.' }),
    project: Schema.optional(Ref.Ref(Project)).annotate({ description: 'The project the task belongs to.' }),
    tags: Schema.optional(Schema.Array(Schema.String)),
  }),
) {}

export class DependsOn extends Type.makeRelation<DependsOn>(DXN.make('com.example.type.dependsOn', '0.1.0'))({
  source: Task,
  target: Task,
})({}) {}

/** Records every score the agent asked for. */
export const scored: string[] = [];

export const Score = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.score'),
    name: 'Score',
    description: "Scores a task title for urgency. Returns the title's length as the score.",
  },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

/** Takes a task as a reference and marks it done, returning it: objects cross the boundary both ways. */
export const Complete = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.complete'),
    name: 'Complete',
    description: 'Marks a task done and returns it.',
  },
  input: Schema.Struct({ task: Ref.Ref(Task) }),
  output: Schema.Struct({ task: Obj.Unknown }),
});

/** How many `Slow` calls are running now, and the most that ever ran at once. */
export const slowCalls = { running: 0, peak: 0, started: 0 };

/** Waits on the host's real clock, so a test can see whether calls overlap. */
export const Slow = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.slow'),
    name: 'Slow',
    description: 'Waits the given number of milliseconds and returns them.',
  },
  input: Schema.Struct({ ms: Schema.Number }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(
  Slow.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ ms }) {
        slowCalls.started++;
        slowCalls.running++;
        slowCalls.peak = Math.max(slowCalls.peak, slowCalls.running);
        // A real timer: the test clock would never advance an `Effect.sleep` here.
        yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
        slowCalls.running--;
        return ms;
      }),
    ),
  ),
  Score.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ title }) {
        scored.push(title);
        return title.length;
      }),
    ),
  ),
  Complete.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ task }) {
        const loaded = yield* Database.load(task);
        Obj.update(loaded, (loaded) => {
          loaded.status = 'done';
        });
        return { task: loaded };
      }),
    ),
  ),
);

export const TestLayer = AssistantTestLayer({
  types: [Task, Project, DependsOn],
  operationHandlers: [handlers],
});

export const OPERATIONS: SandboxOperation[] = [
  {
    name: 'score',
    description: Score.meta.description,
    parameters: {},
    definition: Score,
    invoke: (input: unknown) => Effect.succeed(Schema.decodeUnknownSync(Score.input)(input).title.length),
  },
  {
    name: 'complete',
    description: Complete.meta.description,
    parameters: {},
    definition: Complete,
    invoke: () => Effect.die(new Error('Called through Operation.invoke only.')),
  },
  {
    name: 'slow',
    description: Slow.meta.description,
    parameters: {},
    definition: Slow,
    invoke: () => Effect.die(new Error('Called through Operation.invoke only.')),
  },
  {
    // A tool with no operation behind it, as an MCP server adds one.
    name: 'echo_upper',
    description: 'Upper-cases text.',
    parameters: {},
    invoke: (input: unknown) =>
      Effect.succeed(
        String(Schema.decodeUnknownSync(Schema.Struct({ text: Schema.String }))(input).text).toUpperCase(),
      ),
  },
];

export const seedTasks = (): Effect.Effect<{ project: Project; tasks: Task[] }, never, Database.Service> =>
  Effect.gen(function* () {
    const project = yield* Database.add(Obj.make(Project, { name: 'Launch' }));
    const tasks = [
      Obj.make(Task, { title: 'Write the docs', status: 'open', project: Ref.make(project), tags: ['docs'] }),
      Obj.make(Task, { title: 'Fix the build', status: 'open', priority: 5 }),
      Obj.make(Task, { title: 'Ship the release', status: 'done', project: Ref.make(project) }),
    ];
    yield* Effect.forEach(tasks, (task) => Database.add(task));
    yield* Database.add(Relation.make(DependsOn, { [Relation.Source]: tasks[2], [Relation.Target]: tasks[1] }));
    yield* Database.flush();
    return { project, tasks };
  });

let engine: Promise<Engine> | undefined;

/** One engine per test file: building the base image is what the rest of the file reuses. */
export const testEngine = (): Promise<Engine> => {
  engine ??= loadGuestBundle().then((bundle) => Engine.make({ bundle }));
  return engine;
};

/** Runs `code` exactly as the eval tool would: the text the model is shown, and whether it failed. */
export const runEvaluate = Effect.fnUntraced(function* (
  code: string,
  { dialect, sandbox }: { dialect: Dialect; sandbox: Sandbox.Sandbox },
) {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  return yield* evaluate({ code, dialect, sandbox, runtime, operations: OPERATIONS }).pipe(
    Effect.match({ onSuccess: (output) => ({ ok: true, output }), onFailure: (output) => ({ ok: false, output }) }),
  );
});

/** The in-process sandbox with the Effect dialect: the reference every djs result is compared with. */
export const IN_PROCESS = { dialect: EffectDialect, sandbox: Sandbox.inProcess };

export { DjsEffectDialect };

/** Every object of the test types, as comparable data: ids replaced by their order of first appearance. */
export const dumpDatabase = Effect.fnUntraced(function* () {
  const objects = [
    ...(yield* Database.query(Filter.type(Project)).run),
    ...(yield* Database.query(Filter.type(Task)).run),
  ];
  return normalizeIds(
    JSON.stringify(
      objects
        .map((object) => {
          const { id: _id, '@meta': _meta, ...rest } = Obj.toJSON(object);
          return { id: object.id, ...rest };
        })
        .sort((left, right) => JSON.stringify({ ...left, id: '' }).localeCompare(JSON.stringify({ ...right, id: '' }))),
    ),
  );
});

/** Replaces each distinct entity id with `#n`, so two databases that created objects in the same order compare equal. */
export const normalizeIds = (text: string): string => {
  const seen = new Map<string, string>();
  return text.replace(/\b[0-9A-HJKMNP-TV-Z]{26}\b/g, (id) => {
    let name = seen.get(id);
    if (!name) {
      name = `#${seen.size + 1}`;
      seen.set(id, name);
    }
    return name;
  });
};
