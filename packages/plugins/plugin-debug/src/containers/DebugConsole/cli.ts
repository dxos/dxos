//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Flag from 'effect/unstable/cli/Flag';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
import type * as Operation from '@dxos/compute/Operation';
import { SpaceId } from '@dxos/keys';
import { getDebugPortController } from '@dxos/react-client/devtools';

/**
 * The debug console's command set — the introspection surface an agent uses over the debug port
 * (operations, snapshot, plugin management), driveable by hand. Operations are invoked through the
 * same invoker the agent path uses, so the two surfaces cannot drift.
 */
export type DebugCli = {
  command: ReturnType<typeof makeCommand>;
  layer: Layer.Layer<Plugin.Service | Capability.Service, never, never>;
};

export type DebugCliOptions = {
  /** Receives each command result as printed — the clipboard source for "copy last result". */
  onResult?: (text: string) => void;
};

const normalizeKey = (key: unknown): string => String(key).replace(/^dxn:/, '');

const findDefinition = Effect.fn(function* (key: string) {
  const capabilities = (yield* Plugin.Service).capabilities;
  const wanted = normalizeKey(key);
  for (const set of capabilities.getAll(Capabilities.OperationHandler)) {
    const definition = set.definitions().find((candidate) => normalizeKey(candidate.meta.key) === wanted);
    if (definition) {
      return definition;
    }
  }
  return yield* Effect.fail(new Error(`Unknown operation: ${key} (try "ops").`));
});

const invokeOperation = Effect.fn(function* (key: string, input: unknown, spaceId?: SpaceId) {
  const capabilities = (yield* Plugin.Service).capabilities;
  const definition = yield* findDefinition(key);
  const invoker = capabilities.get(Capabilities.OperationInvoker);
  const { data, error } = yield* Effect.promise(() =>
    invoker.invokePromise(definition as Operation.Definition.Any, input as never, spaceId ? { spaceId } : undefined),
  );
  if (error) {
    return yield* Effect.fail(error instanceof Error ? error : new Error(String(error)));
  }
  return data;
});

/** Results may hold live objects; a snapshot of what is printable beats a serializer crash. */
const format = (value: unknown): string => {
  if (value === undefined) {
    return 'undefined';
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * Evaluates a snippet with the same bindings the agent debug port provides (`dxos`, `composer`).
 * Tried as an expression first so `1 + 1` works; statements fall back to an async body.
 */
const evalSnippet = (code: string): Promise<unknown> => {
  const compile = () => {
    try {
      // eslint-disable-next-line no-implied-eval -- eval is this console's purpose, same as the debug port.
      return new Function('dxos', 'composer', `'use strict'; return (async () => (${code}))();`);
    } catch {
      // eslint-disable-next-line no-implied-eval -- as above; statement-shaped snippets need a body.
      return new Function('dxos', 'composer', `'use strict'; return (async () => { ${code} })();`);
    }
  };
  return Promise.resolve(compile()(Reflect.get(globalThis, '__DXOS__'), globalThis.composer));
};

const makeCommand = (options: DebugCliOptions = {}) => {
  const print = (value: unknown) =>
    Effect.suspend(() => {
      const text = format(value);
      options.onResult?.(text);
      return Console.log(text);
    });

  const snapshot = Command.make('snapshot', {}, () =>
    Effect.gen(function* () {
      yield* print(yield* invokeOperation('org.dxos.operation.debug.snapshot', {}));
    }),
  ).pipe(Command.withDescription('One JSON document of the live UI state: layout, attention, planks, actions.'));

  const plugins = Command.make(
    'plugins',
    {
      all: Flag.boolean('all').pipe(Flag.withDescription('Include disabled plugins.')),
    },
    ({ all }) =>
      Effect.gen(function* () {
        const manager = yield* Plugin.Service;
        const enabled = new Set(manager.getEnabled());
        const active = new Set(manager.getActive());
        const rows = manager
          .getPlugins()
          .map((plugin) => {
            const id = plugin.meta.profile.key;
            return {
              id,
              enabled: enabled.has(id),
              active: plugin.modules.some((module) => active.has(module.id)),
            };
          })
          .filter((row) => all || row.enabled);
        yield* print(rows);
      }),
  ).pipe(Command.withDescription('List plugins on this host.'));

  const enable = Command.make(
    'enable',
    {
      ids: Args.string('ids').pipe(Args.withDescription('Plugin ids.'), Args.variadic({ min: 1 })),
    },
    ({ ids }) =>
      Effect.gen(function* () {
        yield* print(yield* invokeOperation('org.dxos.operation.registry.enablePlugins', { ids }));
      }),
  ).pipe(Command.withDescription('Enable plugins (with their dependencies).'));

  const disable = Command.make(
    'disable',
    {
      ids: Args.string('ids').pipe(Args.withDescription('Plugin ids.'), Args.variadic({ min: 1 })),
    },
    ({ ids }) =>
      Effect.gen(function* () {
        yield* print(yield* invokeOperation('org.dxos.operation.registry.disablePlugins', { ids }));
      }),
  ).pipe(Command.withDescription('Disable plugins (with their enabled dependents).'));

  const ops = Command.make(
    'ops',
    {
      filter: Args.string('filter').pipe(
        Args.withDescription('Substring filter on the key.'),
        Args.variadic({ max: 1 }),
      ),
    },
    ({ filter }) =>
      Effect.gen(function* () {
        const capabilities = (yield* Plugin.Service).capabilities;
        const needle = filter[0]?.toLowerCase();
        const keys = new Set<string>();
        for (const set of capabilities.getAll(Capabilities.OperationHandler)) {
          for (const definition of set.definitions()) {
            const key = normalizeKey(definition.meta.key);
            if (!needle || key.toLowerCase().includes(needle)) {
              keys.add(key);
            }
          }
        }
        yield* print([...keys].sort());
      }),
  ).pipe(Command.withDescription('List invokable operations.'));

  const invoke = Command.make(
    'invoke',
    {
      key: Args.string('key').pipe(Args.withDescription('Operation key (bare or dxn: form).')),
      input: Args.string('input').pipe(Args.withDescription('JSON input; defaults to {}.'), Args.variadic({ max: 1 })),
      space: Flag.string('space').pipe(
        Flag.optional,
        Flag.withDescription('Space id, for operations that declare a database service.'),
      ),
    },
    ({ key, input, space }) =>
      Effect.gen(function* () {
        const parsed: unknown = input[0] ? JSON.parse(input[0]) : {};
        const spaceId = space._tag === 'Some' ? SpaceId.make(space.value) : undefined;
        yield* print(yield* invokeOperation(key, parsed, spaceId));
      }),
  ).pipe(Command.withDescription('Invoke an operation with a JSON payload.'));

  const evaluate = Command.make(
    'eval',
    {
      code: Args.string('code').pipe(Args.withDescription('JavaScript to evaluate.'), Args.variadic({ min: 1 })),
    },
    ({ code }) =>
      Effect.gen(function* () {
        yield* print(yield* Effect.promise(() => evalSnippet(code.join(' '))));
      }),
  ).pipe(Command.withDescription('Evaluate a snippet with `dxos` and `composer` in scope.'));

  const port = Command.make(
    'port',
    {
      action: Args.string('action').pipe(
        Args.withDescription('start | stop; omit for status.'),
        Args.variadic({ max: 1 }),
      ),
    },
    ({ action }) =>
      Effect.gen(function* () {
        const controller = getDebugPortController();
        switch (action[0]) {
          case 'start': {
            const session = controller.start({ persist: true });
            yield* print(`Session: ${session}`);
            break;
          }
          case 'stop': {
            controller.stop();
            yield* print('Stopped.');
            break;
          }
          default: {
            yield* print(controller.getStatus());
          }
        }
      }),
  ).pipe(Command.withDescription('Agent debug port: status, start, stop.'));

  return Command.make('debug').pipe(
    Command.withDescription('Composer debug console.'),
    Command.withSubcommands([snapshot, plugins, enable, disable, ops, invoke, evaluate, port]),
  );
};

export const createDebugCli = (manager: PluginManager.PluginManager, options?: DebugCliOptions): DebugCli => ({
  command: makeCommand(options),
  layer: Layer.mergeAll(
    Layer.succeed(Plugin.Service, manager),
    Layer.succeed(Capability.Service, manager.capabilities),
  ),
});
