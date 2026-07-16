//
// Copyright 2026 DXOS.org
//

import { assert, describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { DXN } from '@dxos/keys';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import * as Plugin from './plugin';
import * as PluginManager from './plugin-manager';

const String = Capability.make<{ string: string }>('org.dxos.test.string');
const Number = Capability.make<{ number: number }>('org.dxos.test.number');
const Total = Capability.make<{ total: number }>('org.dxos.test.total');
const Multi = Capability.makeMulti<{ entry: string }>('org.dxos.test.multi');

const CountEvent = ActivationEvent.make('org.dxos.test.count');

const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test'), name: 'Test' });

const makeManager = () =>
  PluginManager.make({
    pluginLoader: (id: string) => Effect.fail(new Error(`Plugin not found: ${id}`)),
  });

describe('Plugin module authoring', () => {
  describe('dependency mode', () => {
    it('normalizes provides/requires declarations', () => {
      const Test = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'total',
            requires: [String, Number],
            provides: [Total],
            activate: Effect.fnUntraced(function* () {
              const { string } = yield* String;
              const { number } = yield* Number;
              return [Capability.provide(Total, { total: string.length + number })];
            }),
          }),
        ),
      );

      const [module] = Test().modules;
      assert(module.activation.mode === 'dependency');
      expect(module.activation.requires).toEqual([String, Number]);
      expect(module.activation.provides).toEqual([Total]);
      expect(module.activatesOn).toBeUndefined();
      expect(module.id).toEqual('org.dxos.plugin.test.module.total');
    });

    it.effect('activate runs against the declared requires', () =>
      Effect.gen(function* () {
        const manager = makeManager();
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'total',
              requires: [String, Number],
              provides: [Total],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                const { number } = yield* Number;
                return [Capability.provide(Total, { total: string.length + number })];
              }),
            }),
          ),
        );

        const [module] = Test().modules;
        const requires = Context.empty().pipe(
          Context.add(String, { string: 'abc' }),
          Context.add(Number, { number: 2 }),
        );
        const result = yield* module.activate().pipe(
          Effect.provide(requires),
          Effect.provideService(Capability.Service, manager.capabilities),
          Effect.provideService(Plugin.Service, manager),
          Effect.scoped,
        );
        assert(Array.isArray(result));
        const entries = Capability.expandContributions(result);
        expect(entries).toHaveLength(1);
        expect(entries[0].interface).toBe(Total);
        expect(entries[0].implementation).toEqual({ total: 5 });
      }),
    );

    it('empty provides declares a startup root', () => {
      const Test = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'root',
            provides: [],
            activate: () => Effect.void,
          }),
        ),
      );
      const [module] = Test().modules;
      assert(module.activation.mode === 'dependency');
      expect(module.activation.provides).toEqual([]);
    });
  });

  describe('event mode', () => {
    it('normalizes activatesOn with requires', () => {
      const Test = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'listener',
            activatesOn: CountEvent,
            requires: [String],
            provides: [],
            activate: Effect.fnUntraced(function* () {
              yield* String;
              return [];
            }),
          }),
        ),
      );
      const [module] = Test().modules;
      assert(module.activation.mode === 'event');
      expect(module.activation.activatesOn).toEqual(CountEvent);
      expect(module.activation.requires).toEqual([String]);
      expect(module.activatesOn).toEqual(CountEvent);
    });
  });

  describe('legacy mode', () => {
    it('legacy options still compile and normalize', () => {
      const Test = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'legacy',
            activatesOn: CountEvent,
            firesAfterActivation: [ActivationEvent.make('org.dxos.test.after')],
            activate: () => Effect.succeed(Capability.contributes(String, { string: 'legacy' })),
          }),
        ),
      );
      const [module] = Test().modules;
      assert(module.activation.mode === 'legacy');
      expect(module.activatesOn).toEqual(CountEvent);
      expect(module.firesAfterActivation).toHaveLength(1);
    });
  });

  describe('type-level enforcement', () => {
    it('rejects invalid module shapes', () => {
      const builder = Plugin.define(testMeta);

      builder.pipe(
        // @ts-expect-error requires without provides or activatesOn matches no mode.
        Plugin.addModule({
          id: 'invalid',
          requires: [String],
          activate: () => Effect.void,
        }),
      );

      builder.pipe(
        // fires* wiring cannot be combined with capability declarations.
        Plugin.addModule({
          id: 'mixed',
          activatesOn: CountEvent,
          // @ts-expect-error legacy options do not accept requires.
          requires: [String],
          firesAfterActivation: [CountEvent],
          activate: () => Effect.void,
        }),
      );

      // The type errors above do not stop execution; the runtime normalizer rejects the
      // invalid shapes when the plugin factory resolves its modules.
      expect(builder.modules).toHaveLength(2);
      expect(() => Plugin.make(builder)()).toThrow();
    });

    it('rejects an activate that does not cover its provides', () => {
      Plugin.define(testMeta).pipe(
        // @ts-expect-error the return misses the declared Total contribution.
        Plugin.addModule({
          id: 'incomplete',
          provides: [Total],
          activate: () => Effect.succeed([]),
        }),
      );
    });

    it('rejects an activate that returns undeclared capabilities', () => {
      Plugin.define(testMeta).pipe(
        // @ts-expect-error Total is not declared in provides.
        Plugin.addModule({
          id: 'excess',
          provides: [],
          activate: () => Effect.succeed([Capability.provide(Total, { total: 1 })]),
        }),
      );
    });

    it('rejects yielding an undeclared capability', () => {
      Plugin.define(testMeta).pipe(
        // @ts-expect-error Number is not declared in requires.
        Plugin.addModule({
          id: 'undeclared',
          requires: [String],
          provides: [],
          activate: Effect.fnUntraced(function* () {
            yield* Number;
            return [];
          }),
        }),
      );
    });
  });

  describe('lazyModule', () => {
    it.effect('carries its spec eagerly and loads the body on demand', () =>
      Effect.gen(function* () {
        const manager = makeManager();
        const Lazy = Capability.lazyModule('Total', { requires: [Number], provides: [Total] }, () =>
          Promise.resolve({
            default: Effect.fnUntraced(function* () {
              const { number } = yield* Number;
              return [Capability.provide(Total, { total: number })];
            }),
          }),
        );

        expect(Capability.getModuleTag(Lazy)).toEqual('Total');
        expect(Lazy.requires).toEqual([Number]);
        expect(Lazy.provides).toEqual([Total]);

        const result = yield* Lazy().pipe(
          Effect.provide(Context.make(Number, { number: 7 })),
          Effect.provideService(Capability.Service, manager.capabilities),
          Effect.provideService(Plugin.Service, manager),
          Effect.scoped,
        );
        assert(Array.isArray(result));
        const entries = Capability.expandContributions(result);
        expect(entries[0].implementation).toEqual({ total: 7 });
      }),
    );

    it('provideAll expands into one entry per value', () => {
      const contribution = Capability.provideAll(Multi, [{ entry: 'a' }, { entry: 'b' }]);
      const entries = Capability.expandContributions([contribution]);
      expect(entries).toHaveLength(2);
      expect(entries.map((entry) => entry.implementation)).toEqual([{ entry: 'a' }, { entry: 'b' }]);
      expect(entries[0].deactivate).toBeUndefined();
    });
  });
});
