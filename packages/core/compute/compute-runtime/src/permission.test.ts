//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN } from '@dxos/echo';
import { Grant, Guard, Permission, Policy, Principal, Requirement, Subject } from '@dxos/permission';

import * as OperationProcess from './OperationProcess.ts';
import * as ProcessManager from './ProcessManager.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import { TestDatabaseLayer } from './testing/index.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';

const user = Principal.identity('did:halo:ALICE');
const agent = Principal.process('process://local/agent');

/** Declares nothing, so it runs in any process. */
const Echo = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.echo'), name: 'Echo' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.String,
});

/** Stands in for running a command in a sandbox. */
const Exec = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.exec'), name: 'Exec' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
}).pipe(Guard.requires(Requirement.make('/sandbox/exec')));

/** Requires `/email/send`, and only to dxos.org addresses whatever the grant says. */
const SendEmail = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.sendEmail'), name: 'Send email' },
  input: Schema.Struct({ to: Schema.String }),
  output: Schema.String,
}).pipe(Guard.requires(Requirement.make('/email/send', { policy: [Policy.like('.args.to', '*@dxos.org')] })));

/** Declares nothing itself and invokes `Exec`, so the nested call is checked against this process's guard. */
const RunScript = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.runScript'), name: 'Run script' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
});

const execEverything = Guard.make({ principal: agent, source: Guard.attested([]) });

/** Spawns `Exec` as a child with a guard that would admit it, to show a child cannot widen its parent. */
const Escalate = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.escalate'), name: 'Escalate' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
  services: [Process.ManagerService],
});

const handlers = OperationHandlerSet.make(
  Echo.pipe(Operation.withHandler(({ text }) => Effect.succeed(text))),
  Exec.pipe(Operation.withHandler(({ command }) => Effect.succeed(`ran ${command}`))),
  SendEmail.pipe(Operation.withHandler(({ to }) => Effect.succeed(`sent to ${to}`))),
  RunScript.pipe(Operation.withHandler(({ command }) => Operation.invoke(Exec, { command }))),
  Escalate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ command }) {
        const allowExec = Guard.make({ principal: agent, source: Guard.attested([yield* grantTo('/sandbox/exec')]) });
        const child = yield* Process.spawn(OperationProcess.make(Exec), { command }, { guard: allowExec });
        return yield* Process.awaitOutput(child);
      }),
    ),
  ),
);

const TestLayer = ProcessOperationInvoker.layer
  .pipe(Layer.provideMerge(UnifiedProcessManager.layer))
  .pipe(
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
    Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
    Layer.provide(TestDatabaseLayer({ types: [] })),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(handlers)),
    Layer.provideMerge(Registry.layer),
    Layer.provide(Trace.layerNoop),
  );

/** A grant from the user to the agent process for one command on every subject. */
function grantTo(command: string) {
  return Grant.make({
    issuer: user,
    audience: agent,
    permissions: [Permission.make({ subject: Subject.any(), command })],
  });
}

/** A guard for the agent process holding exactly these commands. */
const guardFor = Effect.fnUntraced(function* (...commands: string[]) {
  const grants = yield* Effect.forEach(commands, grantTo);
  return Guard.make({ principal: agent, source: Guard.attested(grants) });
});

const run = <I, O>(op: Operation.Definition<I, O>, input: I, options?: Process.SpawnOptions) =>
  Process.spawn(OperationProcess.make(op), input, options).pipe(Effect.flatMap(Process.awaitOutput), Effect.exit);

/** The refusal's message when the run died with `OperationDeniedError`, else undefined. */
const denial = <A, E>(exit: Exit.Exit<A, E>): string | undefined => {
  if (Exit.isSuccess(exit)) {
    return undefined;
  }
  const defect = Cause.squash(exit.cause);
  return Operation.OperationDeniedError.is(defect) && defect instanceof Error ? defect.message : undefined;
};

describe('operation permissions', () => {
  it.effect(
    'an operation that declares no requirements runs in a process with no guard',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Echo, { text: 'hello' });
      expect(exit).toEqual(Exit.succeed('hello'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'an operation that declares requirements is refused in a process with no guard',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' });
      expect(denial(exit)).toContain('requires permissions and the invoking process holds none');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'the top-level invoker refuses it too',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessOperationInvoker.Service;
      const exit = yield* invoker.invoke(Exec, { command: 'ls' }).pipe(Effect.exit);
      expect(denial(exit)).toContain('holds none');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a process spawned with a covering grant runs it',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { guard: yield* guardFor('/sandbox/exec') });
      expect(exit).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a grant for a parent command covers its descendants',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { guard: yield* guardFor('/sandbox') });
      expect(exit).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a process whose grants do not cover the command is refused',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { guard: yield* guardFor('/email/send') });
      expect(denial(exit)).toContain('no grant covers the subject and command');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "the operation's policy is checked against its input",
    Effect.fn(function* ({ expect }) {
      const guard = yield* guardFor('/email/send');
      expect(yield* run(SendEmail, { to: 'rich@dxos.org' }, { guard })).toEqual(Exit.succeed('sent to rich@dxos.org'));
      const refused = yield* run(SendEmail, { to: 'someone@example.com' }, { guard });
      expect(denial(refused)).toContain('.args.to matches *@dxos.org');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "a nested invocation is checked against the parent process's guard",
    Effect.fn(function* ({ expect }) {
      const allowed = yield* run(RunScript, { command: 'ls' }, { guard: yield* guardFor('/sandbox/exec') });
      expect(allowed).toEqual(Exit.succeed('ran ls'));
      const refused = yield* run(RunScript, { command: 'ls' }, { guard: yield* guardFor('/email/send') });
      expect(denial(refused)).toContain('no grant covers');
      const unguarded = yield* run(RunScript, { command: 'ls' });
      expect(denial(unguarded)).toContain('holds none');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "a child spawned with its own guard cannot widen its parent's",
    Effect.fn(function* ({ expect }) {
      const refused = yield* run(Escalate, { command: 'rm' }, { guard: yield* guardFor('/email/send') });
      expect(denial(refused)).toContain('no grant covers');
      const allowed = yield* run(Escalate, { command: 'ls' }, { guard: yield* guardFor('/sandbox/exec') });
      expect(allowed).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a guard with no grants refuses every operation that declares requirements and none that does not',
    Effect.fn(function* ({ expect }) {
      expect(yield* run(Echo, { text: 'hi' }, { guard: execEverything })).toEqual(Exit.succeed('hi'));
      expect(denial(yield* run(Exec, { command: 'ls' }, { guard: execEverything }))).toContain('no grant covers');
    }, Effect.provide(TestLayer)),
  );
});
