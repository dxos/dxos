//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Fibonacci, Reply, ReplyHandler } from '@dxos/compute/testing';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { BaseError } from '@dxos/errors';
import { DXN, EntityId } from '@dxos/keys';

export const TEST_PLUGIN_KEY = 'org.dxos.plugin.hostTest';

export const TestSkill: Skill.Definition = {
  key: 'org.dxos.skill.hostTest',
  make: () =>
    Skill.make({
      key: 'org.dxos.skill.hostTest',
      name: 'Host test',
      description: 'Exercises the plugin host.',
      mcpPrompt: true,
      tools: Skill.toolDefinitions({ operations: [Reply] }),
    }),
};

/** A trace event {@link Inspect} writes. */
export const InspectEvent = Trace.EventType('hostTest.inspect', {
  schema: Schema.Struct({ note: Schema.String }),
  isEphemeral: false,
});

/** Reports the request context the host gave it: whether it was cancelled, and an id it minted. */
export const Inspect = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.inspect'), name: 'Inspect' },
  services: [Trace.TraceService],
  input: Schema.Struct({ waitForCancel: Schema.optional(Schema.Boolean) }),
  output: Schema.Struct({ cancelled: Schema.Boolean, id: Schema.String }),
});

const InspectHandler = Inspect.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ waitForCancel }) {
      yield* Trace.write(InspectEvent, { note: 'inspected' });
      const signal = yield* Cancellation.signal;
      if (waitForCancel && !signal.aborted) {
        // Bounded, so a host that never cancels fails the assertion rather than the test's timeout.
        yield* Effect.callback<void>((resume) => {
          const timer = setTimeout(() => resume(Effect.void), 2_000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resume(Effect.void);
          });
        });
      }
      return { cancelled: signal.aborted, id: EntityId.random() };
    }),
  ),
);

/** A service only EDGE holds, as plugin-discord's bot is. */
export class Greeter extends Context.Service<
  Greeter,
  {
    readonly greet: (name: string) => Effect.Effect<string, Error>;
    readonly names: () => Stream.Stream<string, Error>;
  }
>()('@dxos/plugin-host-cloudflare/testing/Greeter') {}

/** The key a host serves the {@link Greeter} under as plain data, for the plugin's {@link GreeterAdapter}. */
export const GREETER_WIRE_KEY = '@dxos/plugin-host-cloudflare/testing/GreeterWire';

/** Builds the {@link Greeter} from its wire service, decoding what crosses, as plugin-agent builds its brain. */
const GreeterAdapter: Capabilities.HostServiceAdapter = {
  host: GREETER_WIRE_KEY,
  service: Greeter.key,
  make: (wire) => {
    const send = (method: string, ...args: readonly unknown[]): Effect.Effect<unknown, Error> => {
      const call = wire[method];
      return call === undefined ? Effect.fail(new TestFailure({ message: `No ${method}.` })) : call(...args);
    };
    return Greeter.of({
      greet: (name) =>
        send('greet', name).pipe(
          Effect.flatMap((value) => Schema.decodeUnknownEffect(Schema.String)(value)),
          Effect.map((greeting) => `${greeting} (adapted)`),
        ),
      names: () =>
        Stream.fromIterableEffect(
          send('names').pipe(Effect.flatMap((value) => Schema.decodeUnknownEffect(Schema.Array(Schema.String))(value))),
        ),
    });
  },
};

/** Greets everyone the {@link Greeter} names. */
export const Greet = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.greet'), name: 'Greet' },
  services: [Greeter],
  input: Schema.Struct({}),
  output: Schema.Array(Schema.String),
});

const GreetHandler = Greet.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const greeter = yield* Greeter;
      const names = yield* Stream.runCollect(greeter.names()).pipe(Effect.orDie);
      return yield* Effect.forEach(names, (name) => greeter.greet(name).pipe(Effect.orDie));
    }),
  ),
);

/** Runs an operation of this plugin and one of another plugin's. */
export const Delegate = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.delegate'), name: 'Delegate' },
  services: [Operation.Service],
  input: Schema.Struct({ n: Schema.Number }),
  output: Schema.Struct({ reply: Schema.Any, fibonacci: Schema.Any }),
});

const DelegateHandler = Delegate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ n }) {
      const reply = yield* Operation.invoke(Reply, { n });
      const fibonacci = yield* Operation.invoke(Fibonacci, { iterations: n });
      return { reply, fibonacci };
    }),
  ),
);

/** Runs {@link Inspect} in process, then mints an id of its own. */
export const Nest = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.nest'), name: 'Nest' },
  services: [Operation.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({ inner: Schema.String, after: Schema.String }),
});

const NestHandler = Nest.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const { id } = yield* Operation.invoke(Inspect, {});
      return { inner: id, after: EntityId.random() };
    }),
  ),
);

/** Schedules another plugin's operation as a followup, then succeeds. */
export const Followup = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.followup'), name: 'Followup' },
  services: [Operation.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({ done: Schema.Boolean }),
});

const FollowupHandler = Followup.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.schedule(Fibonacci, { iterations: 3 });
      return { done: true };
    }),
  ),
);

/** Makes a person, as an operation that returns an ECHO object does. */
export const MakePerson = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.makePerson'), name: 'Make person' },
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Struct({ person: Obj.Unknown }),
});

const MakePersonHandler = MakePerson.pipe(
  Operation.withHandler(({ name }) => Effect.succeed({ person: Obj.make(TestSchema.Person, { name }) })),
);

/** Runs {@link MakePerson} in process and reports whether the person came back as a live object. */
export const Adopt = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.adopt'), name: 'Adopt' },
  services: [Operation.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({ live: Schema.Boolean }),
});

const AdoptHandler = Adopt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const { person } = yield* Operation.invoke(MakePerson, { name: 'Ada' });
      return { live: Obj.instanceOf(TestSchema.Person, person) };
    }),
  ),
);

/** The typed error {@link Fails} raises. */
export class TestFailure extends BaseError.extend('TestFailure', 'The test operation failed.') {}

/** Fails with a typed error that carries context, as `agent.recordFacts` does with `EntityNotFoundError`. */
export const Fails = Operation.make({
  meta: { key: DXN.make('com.example.operation.hostTest.fails'), name: 'Fails' },
  input: Schema.Struct({}),
  output: Schema.Struct({}),
});

const FailsHandler = Fails.pipe(
  Operation.withHandler(() => Effect.fail(new TestFailure({ context: { uri: 'echo:///missing' } }))),
);

/** A plugin with no UI that contributes one type, one operation and one skill. */
export const TestPlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make(TEST_PLUGIN_KEY), name: 'Host test' })).pipe(
  Plugin.addModule(AppCapability.schema([TestSchema.Person])),
  Plugin.addModule(
    Capability.inlineModule('TestOperations', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed(
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            ReplyHandler,
            InspectHandler,
            GreetHandler,
            DelegateHandler,
            NestHandler,
            FollowupHandler,
            MakePersonHandler,
            AdoptHandler,
            FailsHandler,
          ),
        ),
      ),
    ),
  ),
  Plugin.addModule(
    Capability.inlineModule('TestHostServiceAdapter', { provides: [Capabilities.HostServiceAdapter] }, () =>
      Effect.succeed(Capability.contribute(Capabilities.HostServiceAdapter, GreeterAdapter)),
    ),
  ),
  Plugin.addModule(
    Capability.inlineModule('TestSkill', { provides: [AppCapabilities.SkillDefinition] }, () =>
      Effect.succeed(Capability.contribute(AppCapabilities.SkillDefinition, TestSkill)),
    ),
  ),
  Plugin.make,
);
