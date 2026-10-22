//
// Copyright 2026 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
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

const pluginLoader = (id: string) => Effect.fail(new Error(`no loader for ${id}`));

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

const startManager = (plugin: Plugin.Plugin) =>
  Effect.gen(function* () {
    const manager = PluginManager.make({ plugins: [plugin], enabled: [plugin.meta.profile.key], pluginLoader });
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
      const body = makeBody<string | Error>('v1');
      const manager = yield* startManager(
        Plugin.make(
          Plugin.define(meta).pipe(
            Plugin.addModule({
              id: 'value',
              provides: [Value],
              activate: () =>
                Effect.suspend(() => {
                  const current = body.get();
                  return current instanceof Error
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

      body.set(new Error('syntax error in edit'));
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
