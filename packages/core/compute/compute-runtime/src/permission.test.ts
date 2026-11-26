//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
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
import { Grant, Permission, Policy, Principal, Requirement, Subject } from '@dxos/permission';

import * as Consent from './Consent.ts';
import * as OperationProcess from './OperationProcess.ts';
import * as ProcessManager from './ProcessManager.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';
import { TestDatabaseLayer } from './testing/index.ts';
import * as UnifiedProcessManager from './UnifiedProcessManager.ts';
import * as Verifier from './Verifier.ts';

const user = Principal.identity('did:halo:ALICE');
const agent = Principal.process('process://local/agent');

/** Running a command in the sandbox. */
const SandboxExec = Permission.define({ command: '/sandbox/exec', name: 'Run sandbox commands' });

/** Everything in the sandbox: the parent of {@link SandboxExec}, so a grant for it covers exec too. */
const Sandbox = Permission.define({ command: '/sandbox', name: 'Use the sandbox' });

/** Sending email. */
const EmailSend = Permission.define({ command: '/email/send', name: 'Send email' });

/** Posting to a channel: consentable, so a process that lacks it is asked rather than refused outright. */
const ChannelPost = Permission.define({ command: '/channel/post', name: 'Post to a channel', consentable: true });

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
}).pipe(Operation.requires(Requirement.make(SandboxExec)));

/** Requires {@link EmailSend}, and only to dxos.org addresses whatever the grant says. */
const SendEmail = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.sendEmail'), name: 'Send email' },
  input: Schema.Struct({ to: Schema.String }),
  output: Schema.String,
}).pipe(Operation.requires(Requirement.make(EmailSend, { policy: [Policy.like('.args.to', '*@dxos.org')] })));

/** Requires {@link ChannelPost}, which a person can approve. */
const Post = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.post'), name: 'Post' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.String,
}).pipe(Operation.requires(Requirement.make(ChannelPost)));

/** Invokes `Post` twice, so a test can see whether the second call is asked about again. */
const PostTwice = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.postTwice'), name: 'Post twice' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.String,
});

/** How the test's consent answers, and the requests put to it. */
const consent = {
  answer: (): Effect.Effect<Consent.Answer> => Effect.succeed({ _tag: 'Declined' }),
  asked: [] as string[],
};

const consentLayer = Layer.succeed(Consent.Service, {
  ask: ({ requirement }) =>
    Effect.suspend(() => {
      consent.asked.push(requirement.command);
      return consent.answer();
    }),
});

/** Declares nothing itself and invokes `Exec`, so the nested call is checked against this process's authority. */
const RunScript = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.runScript'), name: 'Run script' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
});

/** Opened by a test once it has changed the waiting process's grants. */
let gate = Deferred.makeUnsafe<void>();

/** Waits for {@link gate}, then invokes `Exec`, so a test can add grants to it while it runs. */
const WaitThenExec = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.waitThenExec'), name: 'Wait then exec' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
});

const noGrants: Process.Authority = { principal: agent, grants: [] };

/** Spawns `Exec` as a child with an authority that would admit it, to show a child cannot widen its parent. */
const Escalate = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.escalate'), name: 'Escalate' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
  services: [Process.ManagerService],
});

/** Spawns `Exec` detached (no parent) with an authority that would admit it, to show detaching does not shed limits. */
const EscapeDetached = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.permission.escapeDetached'), name: 'Escape detached' },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
  services: [Process.ManagerService],
});

const handlers = OperationHandlerSet.make(
  Echo.pipe(Operation.withHandler(({ text }) => Effect.succeed(text))),
  Exec.pipe(Operation.withHandler(({ command }) => Effect.succeed(`ran ${command}`))),
  SendEmail.pipe(Operation.withHandler(({ to }) => Effect.succeed(`sent to ${to}`))),
  RunScript.pipe(Operation.withHandler(({ command }) => Operation.invoke(Exec, { command }))),
  Post.pipe(Operation.withHandler(({ text }) => Effect.succeed(`posted ${text}`))),
  PostTwice.pipe(
    Operation.withHandler(({ text }) =>
      Operation.invoke(Post, { text }).pipe(Effect.andThen(Operation.invoke(Post, { text }))),
    ),
  ),
  WaitThenExec.pipe(
    Operation.withHandler(({ command }) =>
      Deferred.await(gate).pipe(Effect.andThen(Operation.invoke(Exec, { command }))),
    ),
  ),
  Escalate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ command }) {
        const allowExec: Process.Authority = { principal: agent, grants: [yield* grantTo(SandboxExec)] };
        const child = yield* Process.spawn(OperationProcess.make(Exec), { command }, { authority: allowExec });
        return yield* Process.awaitOutput(child);
      }),
    ),
  ),
  EscapeDetached.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ command }) {
        const allowExec: Process.Authority = { principal: agent, grants: [yield* grantTo(SandboxExec)] };
        const child = yield* Process.spawn(
          OperationProcess.make(Exec),
          { command },
          { parentProcessId: undefined, authority: allowExec },
        );
        return yield* Process.awaitOutput(child);
      }),
    ),
  ),
);

const TestLayer = ProcessOperationInvoker.layer
  .pipe(Layer.provideMerge(UnifiedProcessManager.layer))
  .pipe(
    Layer.provideMerge(
      ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator }).pipe(Layer.provide(Verifier.layer())),
    ),
    Layer.provideMerge(RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
    Layer.provide(ServiceResolver.layerRequirements(Database.Service, Consent.Service)),
    Layer.provide(consentLayer),
    Layer.provide(TestDatabaseLayer({ types: [] })),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(handlers)),
    Layer.provideMerge(Registry.layer),
    Layer.provide(Trace.layerNoop),
  );

/** A grant from the user to the agent process for one permission on every subject. */
function grantTo({ command }: Permission.Definition) {
  return Grant.make({
    issuer: user,
    audience: agent,
    permissions: [Permission.make({ subject: Subject.any(), command })],
  });
}

/** The agent process's authority, holding exactly these permissions. */
const authorityFor = Effect.fnUntraced(function* (...permissions: Permission.Definition[]) {
  return { principal: agent, grants: yield* Effect.forEach(permissions, grantTo) } satisfies Process.Authority;
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
    'an operation that declares no requirements runs in a process with no authority',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Echo, { text: 'hello' });
      expect(exit).toEqual(Exit.succeed('hello'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'an operation that declares requirements is refused in a process with no authority',
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
    'a process spawned with an authority holding a covering grant runs it',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { authority: yield* authorityFor(SandboxExec) });
      expect(exit).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a grant for a parent command covers its descendants',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { authority: yield* authorityFor(Sandbox) });
      expect(exit).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a process whose grants do not cover the command is refused',
    Effect.fn(function* ({ expect }) {
      const exit = yield* run(Exec, { command: 'ls' }, { authority: yield* authorityFor(EmailSend) });
      expect(denial(exit)).toContain('no grant covers the subject and command');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "the operation's policy is checked against its input",
    Effect.fn(function* ({ expect }) {
      const authority = yield* authorityFor(EmailSend);
      expect(yield* run(SendEmail, { to: 'rich@dxos.org' }, { authority })).toEqual(
        Exit.succeed('sent to rich@dxos.org'),
      );
      const refused = yield* run(SendEmail, { to: 'someone@example.com' }, { authority });
      expect(denial(refused)).toContain('.args.to matches *@dxos.org');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "a nested invocation is checked against the parent process's authority",
    Effect.fn(function* ({ expect }) {
      const allowed = yield* run(RunScript, { command: 'ls' }, { authority: yield* authorityFor(SandboxExec) });
      expect(allowed).toEqual(Exit.succeed('ran ls'));
      const refused = yield* run(RunScript, { command: 'ls' }, { authority: yield* authorityFor(EmailSend) });
      expect(denial(refused)).toContain('no grant covers');
      const unguarded = yield* run(RunScript, { command: 'ls' });
      expect(denial(unguarded)).toContain('holds none');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "a child spawned with its own authority cannot widen its parent's",
    Effect.fn(function* ({ expect }) {
      const refused = yield* run(Escalate, { command: 'rm' }, { authority: yield* authorityFor(EmailSend) });
      expect(denial(refused)).toContain('no grant covers');
      const allowed = yield* run(Escalate, { command: 'ls' }, { authority: yield* authorityFor(SandboxExec) });
      expect(allowed).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a detached child is still held to the authority of the process that spawned it',
    Effect.fn(function* ({ expect }) {
      const refused = yield* run(EscapeDetached, { command: 'rm' }, { authority: yield* authorityFor(EmailSend) });
      expect(denial(refused)).toContain('no grant covers');
      const allowed = yield* run(EscapeDetached, { command: 'ls' }, { authority: yield* authorityFor(SandboxExec) });
      expect(allowed).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'an authority with no grants refuses every operation that declares requirements and none that does not',
    Effect.fn(function* ({ expect }) {
      expect(yield* run(Echo, { text: 'hi' }, { authority: noGrants })).toEqual(Exit.succeed('hi'));
      expect(denial(yield* run(Exec, { command: 'ls' }, { authority: noGrants }))).toContain('no grant covers');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'grants added to a live process apply to the calls it makes afterwards',
    Effect.fn(function* ({ expect }) {
      gate = yield* Deferred.make<void>();
      const manager = yield* Process.ManagerService;
      const process = yield* Process.spawn(
        OperationProcess.make(WaitThenExec),
        { command: 'ls' },
        { authority: yield* authorityFor() },
      );
      yield* manager.grant(process.pid, [yield* grantTo(SandboxExec)]);
      yield* Deferred.succeed(gate, undefined);
      expect(yield* Process.awaitOutput(process).pipe(Effect.exit)).toEqual(Exit.succeed('ran ls'));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'without the grant the same call is refused',
    Effect.fn(function* ({ expect }) {
      gate = yield* Deferred.make<void>();
      const process = yield* Process.spawn(
        OperationProcess.make(WaitThenExec),
        { command: 'ls' },
        { authority: yield* authorityFor() },
      );
      yield* Deferred.succeed(gate, undefined);
      expect(denial(yield* Process.awaitOutput(process).pipe(Effect.exit))).toContain('no grant covers');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a grant cannot reach past the authority a child inherited',
    Effect.fn(function* ({ expect }) {
      gate = yield* Deferred.make<void>();
      const manager = yield* ProcessManager.Service;
      const parent = yield* Process.spawn(
        OperationProcess.make(Escalate),
        { command: 'rm' },
        { authority: yield* authorityFor(EmailSend) },
      );
      // The child Escalate spawns holds exec itself, so only the parent's authority refuses it.
      expect(denial(yield* Process.awaitOutput(parent).pipe(Effect.exit))).toContain('no grant covers');
      // Granting the parent afterwards does not reach the finished child, and a process with no authority of its own
      // has nothing to extend.
      const bare = yield* Process.spawn(OperationProcess.make(WaitThenExec), { command: 'ls' });
      const refused = yield* manager.grant(bare.pid, [yield* grantTo(SandboxExec)]).pipe(Effect.exit);
      expect(Exit.isFailure(refused)).toBe(true);
      yield* Deferred.succeed(gate, undefined);
      expect(denial(yield* Process.awaitOutput(bare).pipe(Effect.exit))).toContain('holds none');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a consentable call the authority refuses runs once the person allows it',
    Effect.fn(function* ({ expect }) {
      consent.asked = [];
      consent.answer = () => Effect.succeed({ _tag: 'Once' });
      const exit = yield* run(Post, { text: 'hi' }, { authority: yield* authorityFor() });
      expect(exit).toEqual(Exit.succeed('posted hi'));
      expect(consent.asked).toEqual([ChannelPost.command]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a permission the person grants holds for the calls that follow, which are not asked about again',
    Effect.fn(function* ({ expect }) {
      consent.asked = [];
      consent.answer = () =>
        Effect.map(grantTo(ChannelPost), (grant): Consent.Answer => ({ _tag: 'Grant', grants: [grant] }));
      const exit = yield* run(PostTwice, { text: 'hi' }, { authority: yield* authorityFor() });
      expect(exit).toEqual(Exit.succeed('posted hi'));
      expect(consent.asked).toEqual([ChannelPost.command]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a consentable call the person declines is refused',
    Effect.fn(function* ({ expect }) {
      consent.asked = [];
      consent.answer = () => Effect.succeed({ _tag: 'Declined' });
      const exit = yield* run(Post, { text: 'hi' }, { authority: yield* authorityFor() });
      expect(denial(exit)).toContain('was declined');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a call whose requirement is not consentable is refused without asking',
    Effect.fn(function* ({ expect }) {
      consent.asked = [];
      consent.answer = () => Effect.succeed({ _tag: 'Once' });
      const exit = yield* run(Exec, { command: 'ls' }, { authority: yield* authorityFor() });
      expect(denial(exit)).toContain('no grant covers');
      expect(consent.asked).toEqual([]);
    }, Effect.provide(TestLayer)),
  );
});
