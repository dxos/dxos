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
          OperationHandlerSet.make(ReplyHandler, InspectHandler, GreetHandler, DelegateHandler, FailsHandler),
        ),
      ),
    ),
  ),
  Plugin.addModule(
    Capability.inlineModule('TestSkill', { provides: [AppCapabilities.SkillDefinition] }, () =>
      Effect.succeed(Capability.contribute(AppCapabilities.SkillDefinition, TestSkill)),
    ),
  ),
  Plugin.make,
);
