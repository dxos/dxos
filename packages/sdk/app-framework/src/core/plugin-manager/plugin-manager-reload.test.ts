//
// Copyright 2026 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { DXN } from '@dxos/keys';

import { ActivationEvents } from '../../common/index.ts';
import * as ActivationEvent from '../activation-event.ts';
import * as Capability from '../capability.ts';
import * as Plugin from '../plugin.ts';
import * as PluginManager from './plugin-manager.ts';

const Value = Capability.makeSingleton<{ value: string }>()('org.dxos.test.reload.value');
const Derived = Capability.makeSingleton<{ derived: string }>()('org.dxos.test.reload.derived');
const Items = Capability.make<{ item: string }>()('org.dxos.test.reload.items');

const LateEvent = ActivationEvent.make('org.dxos.test.reload.late');

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.reload'), name: 'Reload' });
const moduleId = (name: string) => `org.dxos.plugin.reload.module.${name}`;

class FixtureError extends Data.TaggedError('FixtureError')<{ message: string }> {}

const pluginLoader = (id: string) => Effect.fail(new FixtureError({ message: `no loader for ${id}` }));

/** Mutable stand-in for the module body a hot update swaps. */
const makeBody = <T>(initial: T) => {
  let current = initial;
  return {
    get: () => current,
    set: (next: T) => {
      current = next;
    },
  };
};

const startManager = (...plugins: Plugin.Plugin[]) =>
  Effect.gen(function* () {
    const manager = PluginManager.make({
      plugins,
      enabled: plugins.map((plugin) => plugin.meta.profile.key),
      pluginLoader,
    });
    yield* manager.start();
    yield* manager.activate(ActivationEvents.Idle);
    return manager;
  });

describe('PluginManager.reload', () => {
  it.effect('re-runs the module and swaps its contributions', () =>
    Effect.gen(function* () {
      const body = makeBody('v1');
      let runs = 0;
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'value',
              provides: [Value],
              activate: () =>
                Effect.sync(() => {
                  runs++;
                  return [Capability.contribute(Value, { value: body.get() })];
                }),
            }),
          ),
        )(),
      );
      assert.strictEqual(manager.capabilities.get(Value).value, 'v1');

      body.set('v2');
      assert.isTrue(yield* manager.reload([moduleId('value')]));
      assert.strictEqual(manager.capabilities.get(Value).value, 'v2');
      assert.strictEqual(manager.capabilities.getAll(Value).length, 1);
      assert.strictEqual(runs, 2);
      assert.include(manager.getActive(), moduleId('value'));
    }),
  );

  it.effect('closes the previous activation scope before re-running', () =>
    Effect.gen(function* () {
      const log: string[] = [];
      let version = 0;
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'items',
              provides: [Items],
              activate: Effect.fnUntraced(function* () {
                const current = ++version;
                log.push(`start ${current}`);
                yield* Effect.addFinalizer(() => Effect.sync(() => log.push(`stop ${current}`)));
                return [Capability.contribute(Items, { item: `item ${current}` })];
              }),
            }),
          ),
        )(),
      );

      yield* manager.reload([moduleId('items')]);
      assert.deepStrictEqual(log, ['start 1', 'stop 1', 'start 2']);
      assert.deepStrictEqual(
        manager.capabilities.getAll(Items).map(({ item }) => item),
        ['item 2'],
      );
    }),
  );

  it.effect('re-activates dependents of a reloaded singleton provider', () =>
    Effect.gen(function* () {
      const body = makeBody('v1');
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'value',
              provides: [Value],
              activate: () => Effect.sync(() => [Capability.contribute(Value, { value: body.get() })]),
            }),
            Plugin.addModule({
              id: 'derived',
              requires: [Value],
              provides: [Derived],
              activate: Effect.fnUntraced(function* () {
                const { value } = yield* Value;
                return [Capability.contribute(Derived, { derived: `from ${value}` })];
              }),
            }),
          ),
        )(),
      );
      assert.strictEqual(manager.capabilities.get(Derived).derived, 'from v1');

      body.set('v2');
      assert.isTrue(yield* manager.reload([moduleId('value')]));
      assert.strictEqual(manager.capabilities.get(Derived).derived, 'from v2');
      assert.includeMembers([...manager.getActive()], [moduleId('value'), moduleId('derived')]);
    }),
  );

  it.effect('recovers a module whose reloaded body failed once the body is fixed', () =>
    Effect.gen(function* () {
      const body = makeBody<string | FixtureError>('v1');
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'value',
              provides: [Value],
              activate: () =>
                Effect.suspend(() => {
                  const current = body.get();
                  return current instanceof FixtureError
                    ? Effect.fail(current)
                    : Effect.succeed([Capability.contribute(Value, { value: current })]);
                }),
            }),
            Plugin.addModule({
              id: 'derived',
              requires: [Value],
              provides: [Derived],
              activate: Effect.fnUntraced(function* () {
                const { value } = yield* Value;
                return [Capability.contribute(Derived, { derived: `from ${value}` })];
              }),
            }),
          ),
        )(),
      );

      body.set(new FixtureError({ message: 'syntax error in edit' }));
      assert.isFalse(yield* manager.reload([moduleId('value')]));
      assert.notInclude(manager.getActive(), moduleId('value'));
      assert.notInclude(manager.getActive(), moduleId('derived'));
      assert.lengthOf(manager.capabilities.getAll(Value), 0);

      body.set('v3');
      assert.isTrue(yield* manager.reload([moduleId('value')]));
      assert.strictEqual(manager.capabilities.get(Derived).derived, 'from v3');
      assert.lengthOf(manager.getFailed(), 0);
    }),
  );

  it.effect('reloads an event-gated module whose event already fired', () =>
    Effect.gen(function* () {
      const body = makeBody('v1');
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'late',
              activatesOn: LateEvent,
              provides: [Value],
              activate: () => Effect.sync(() => [Capability.contribute(Value, { value: body.get() })]),
            }),
          ),
        )(),
      );
      yield* manager.activate(LateEvent);
      assert.strictEqual(manager.capabilities.get(Value).value, 'v1');

      body.set('v2');
      assert.isTrue(yield* manager.reload([moduleId('late')]));
      assert.strictEqual(manager.capabilities.get(Value).value, 'v2');
    }),
  );

  it.effect('ignores modules that never activated', () =>
    Effect.gen(function* () {
      let runs = 0;
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'late',
              activatesOn: LateEvent,
              provides: [Value],
              activate: () =>
                Effect.sync(() => {
                  runs++;
                  return [Capability.contribute(Value, { value: 'v1' })];
                }),
            }),
          ),
        )(),
      );

      assert.isFalse(yield* manager.reload([moduleId('late'), 'org.dxos.plugin.unknown.module.x']));
      assert.strictEqual(runs, 0);
      assert.notInclude(manager.getActive(), moduleId('late'));
    }),
  );
});

const Extra = Capability.makeSingleton<{ extra: string }>()('org.dxos.test.reload.extra');
const consumerMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.reloadConsumer'), name: 'Consumer' });

/** A lazy plugin whose definition can be swapped, as a hot update of its entry file does. */
const makeLazyPlugin = (initial: Plugin.PluginFactory<void>) => {
  let definition = initial;
  return {
    plugin: Plugin.lazy(meta, () => Promise.resolve({ default: definition }))(),
    set: (next: Plugin.PluginFactory<void>) => {
      definition = next;
    },
  };
};

const valueModule = (
  value: string,
  log: string[],
): ((builder: Plugin.PluginBuilder<void>) => Plugin.PluginBuilder<void>) =>
  Plugin.addModule({
    id: 'value',
    provides: [Value],
    activate: Effect.fnUntraced(function* () {
      yield* Effect.addFinalizer(() => Effect.sync(() => log.push(`stop ${value}`)));
      return [Capability.contribute(Value, { value })];
    }),
  });

/** A definition contributing `Value` (logging its teardown), plus `Extra` when asked. */
const definition = (value: string, log: string[], options: { extra?: boolean } = {}) =>
  Plugin.make(
    options.extra
      ? Plugin.define(meta).pipe(
          valueModule(value, log),
          Plugin.addModule({
            id: 'extra',
            provides: [Extra],
            activate: () => Effect.succeed([Capability.contribute(Extra, { extra: value })]),
          }),
        )
      : Plugin.define(meta).pipe(valueModule(value, log)),
  );

/** Another plugin's module that requires the reloaded plugin's singleton. */
const consumer = Plugin.make(
  Plugin.define(consumerMeta).pipe(
    Plugin.addModule({
      id: 'derived',
      requires: [Value],
      provides: [Derived],
      activate: Effect.fnUntraced(function* () {
        const { value } = yield* Value;
        return [Capability.contribute(Derived, { derived: `from ${value}` })];
      }),
    }),
  ),
);

describe('PluginManager.reloadPlugin', () => {
  it.effect('swaps in a new definition and re-runs dependents in other plugins', () =>
    Effect.gen(function* () {
      const log: string[] = [];
      const lazy = makeLazyPlugin(definition('v1', log));
      const manager = yield* startManager(lazy.plugin, consumer());
      assert.strictEqual(manager.capabilities.get(Derived).derived, 'from v1');

      lazy.set(definition('v2', log, { extra: true }));
      assert.isTrue(yield* manager.reloadPlugin(meta.profile.key));
      assert.deepStrictEqual(log, ['stop v1']);
      assert.strictEqual(manager.capabilities.get(Value).value, 'v2');
      assert.strictEqual(manager.capabilities.get(Extra).extra, 'v2');
      assert.strictEqual(manager.capabilities.get(Derived).derived, 'from v2');
      assert.lengthOf(manager.capabilities.getAll(Value), 1);
    }),
  );

  it.effect('keeps modules the new definition reuses running', () =>
    Effect.gen(function* () {
      let runs = 0;
      const shared = Capability.inlineModule('shared', { provides: [Value] }, () =>
        Effect.sync(() => {
          runs++;
          return [Capability.contribute(Value, { value: 'shared' })];
        }),
      );
      const extra = Capability.inlineModule('extra', { provides: [Extra] }, () =>
        Effect.succeed([Capability.contribute(Extra, { extra: 'added' })]),
      );
      const lazy = makeLazyPlugin(Plugin.make(Plugin.define(meta).pipe(Plugin.addModule(shared))));
      const manager = yield* startManager(lazy.plugin);
      assert.strictEqual(runs, 1);

      // Only the module list changed, as when the plugin's definition file alone is edited.
      lazy.set(Plugin.make(Plugin.define(meta).pipe(Plugin.addModule(shared), Plugin.addModule(extra))));
      assert.isTrue(yield* manager.reloadPlugin(meta.profile.key));
      assert.strictEqual(runs, 1);
      assert.strictEqual(manager.capabilities.get(Extra).extra, 'added');
      assert.strictEqual(manager.capabilities.get(Value).value, 'shared');
    }),
  );

  it.effect('unregisters modules the new definition dropped', () =>
    Effect.gen(function* () {
      const log: string[] = [];
      const lazy = makeLazyPlugin(definition('v1', log, { extra: true }));
      const manager = yield* startManager(lazy.plugin);
      assert.strictEqual(manager.capabilities.get(Extra).extra, 'v1');

      lazy.set(definition('v2', log));
      assert.isTrue(yield* manager.reloadPlugin(meta.profile.key));
      assert.lengthOf(manager.capabilities.getAll(Extra), 0);
      assert.notInclude(
        manager.getModules().map((module) => module.id),
        moduleId('extra'),
      );
    }),
  );

  it.effect('keeps the running plugin when the new definition fails to load', () =>
    Effect.gen(function* () {
      const log: string[] = [];
      let fail = false;
      const plugin = Plugin.lazy(meta, (): Promise<{ default: Plugin.PluginFactory<void> }> =>
        fail
          ? Promise.reject(new FixtureError({ message: 'syntax error in edit' }))
          : Promise.resolve({ default: definition('v1', log) }),
      )();
      const manager = yield* startManager(plugin);

      fail = true;
      const result = yield* manager.reloadPlugin(meta.profile.key).pipe(Effect.result);
      assert.strictEqual(result._tag, 'Failure');
      assert.strictEqual(manager.capabilities.get(Value).value, 'v1');
      assert.deepStrictEqual(log, []);
    }),
  );

  it.effect('replaces a disabled plugin without activating it', () =>
    Effect.gen(function* () {
      const log: string[] = [];
      const lazy = makeLazyPlugin(definition('v1', log));
      const manager = yield* startManager(lazy.plugin);
      yield* manager.disable(meta.profile.key);

      lazy.set(definition('v2', log));
      assert.isTrue(yield* manager.reloadPlugin(meta.profile.key));
      assert.lengthOf(manager.capabilities.getAll(Value), 0);

      yield* manager.enable(meta.profile.key);
      assert.strictEqual(manager.capabilities.get(Value).value, 'v2');
    }),
  );

  it.effect('ignores a plugin that was never resolved', () =>
    Effect.gen(function* () {
      const lazy = makeLazyPlugin(definition('v1', []));
      const manager = PluginManager.make({ plugins: [lazy.plugin], pluginLoader });
      assert.isFalse(yield* manager.reloadPlugin(meta.profile.key));
    }),
  );
});
