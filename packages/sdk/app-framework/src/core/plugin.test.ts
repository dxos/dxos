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

const String = Capability.makeSingleton<{ string: string }>()('org.dxos.test.string');
const Number = Capability.makeSingleton<{ number: number }>()('org.dxos.test.number');
const Total = Capability.makeSingleton<{ total: number }>()('org.dxos.test.total');
const Multi = Capability.make<{ entry: string }>()('org.dxos.test.multi');

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
              return [Capability.contribute(Total, { total: string.length + number })];
            }),
          }),
        ),
      );

      const [module] = Test().modules;
      assert(module.activation.mode === 'dependency');
      expect(module.activation.requires).toEqual([String, Number]);
      expect(module.activation.provides).toEqual([Total]);
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
                return [Capability.contribute(Total, { total: string.length + number })];
              }),
            }),
          ),
        );

        const [module] = Test().modules;
        const requires = Context.empty().pipe(
          Context.add(String, { string: 'abc' }),
          Context.add(Number, { number: 2 }),
        );
        const result = yield* module
          .activate()
          .pipe(
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
    });
  });

  describe('type-level enforcement', () => {
    it('accepts requires-only chain members', () => {
      const builder = Plugin.define(testMeta);

      builder.pipe(
        // A chain member: activates when String becomes available, whichever chain provides it.
        Plugin.addModule({
          id: 'chain-member',
          requires: [String],
          activate: Effect.fnUntraced(function* () {
            yield* String;
          }),
        }),
      );
      const [chainMember] = Plugin.make(builder)().modules;
      assert(chainMember.activation.mode === 'dependency');
      expect(chainMember.activation.requires).toEqual([String]);
      expect(chainMember.activation.provides).toEqual([]);
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
          activate: () => Effect.succeed([Capability.contribute(Total, { total: 1 })]),
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
              return [Capability.contribute(Total, { total: number })];
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
      const contribution = Capability.contributeAll(Multi, [{ entry: 'a' }, { entry: 'b' }]);
      const entries = Capability.expandContributions([contribution]);
      expect(entries).toHaveLength(2);
      expect(entries.map((entry) => entry.implementation)).toEqual([{ entry: 'a' }, { entry: 'b' }]);
      expect(entries[0].deactivate).toBeUndefined();
    });
  });

  describe('inlineModule', () => {
    it('carries its spec with an eager body', () => {
      const Inline = Capability.inlineModule('total', { provides: [Total] }, () =>
        Effect.succeed([Capability.contribute(Total, { total: 1 })]),
      );

      expect(Capability.getModuleTag(Inline)).toEqual('total');
      expect(Inline.requires).toEqual([]);
      expect(Inline.provides).toEqual([Total]);
    });
  });

  describe('moduleMaker', () => {
    const totalModule = Capability.moduleMaker('Total', Total);
    const loader = () =>
      Promise.resolve({
        default: () => Effect.succeed([Capability.contribute(Total, { total: 1 })]),
      });

    it('bakes in the default name and provides', () => {
      const module = totalModule(loader);
      expect(Capability.getModuleTag(module)).toEqual('Total');
      expect(module.requires).toEqual([]);
      expect(module.provides).toEqual([Total]);
    });

    it('merges custom requires and extra provides', () => {
      const module = totalModule(
        () =>
          Promise.resolve({
            default: Effect.fnUntraced(function* () {
              const { number } = yield* Number;
              return [Capability.contribute(Total, { total: number }), Capability.contribute(Multi, { entry: 'a' })];
            }),
          }),
        { name: 'CustomTotal', requires: [Number], provides: [Multi] },
      );
      expect(Capability.getModuleTag(module)).toEqual('CustomTotal');
      expect(module.requires).toEqual([Number]);
      expect(module.provides).toEqual([Total, Multi]);
    });
  });

  describe('addModule (spec-carrying module)', () => {
    it('derives the module id and spec from the module', () => {
      const Lazy = Capability.lazyModule('Total', { provides: [Total] }, () =>
        Promise.resolve({ default: () => Effect.succeed([Capability.contribute(Total, { total: 1 })]) }),
      );
      const Test = Plugin.make(Plugin.define(testMeta).pipe(Plugin.addModule(Lazy)));
      const [module] = Test().modules;
      expect(module.id).toEqual('org.dxos.plugin.test.module.Total');
      assert(module.activation.mode === 'dependency');
      expect(module.activation.provides).toEqual([Total]);
    });

    it.effect('maps plugin options to module props', () =>
      Effect.gen(function* () {
        const manager = makeManager();
        const Lazy = Capability.lazyModule(
          'Total',
          {
            provides: [Total],
            props: ({ offset }: { offset: number }) => ({ start: offset + 1 }),
          },
          () =>
            Promise.resolve({
              default: (props: { start: number }) =>
                Effect.succeed([Capability.contribute(Total, { total: props.start })]),
            }),
        );
        const Test = Plugin.make(Plugin.define<{ offset: number }>(testMeta).pipe(Plugin.addModule(Lazy)));

        const [module] = Test({ offset: 41 }).modules;
        expect(module.id).toEqual('org.dxos.plugin.test.module.Total');
        assert(module.activation.mode === 'dependency');
        expect(module.activation.provides).toEqual([Total]);

        const result = yield* module
          .activate()
          .pipe(
            Effect.provideService(Capability.Service, manager.capabilities),
            Effect.provideService(Plugin.Service, manager),
            Effect.scoped,
          );
        assert(Array.isArray(result));
        const entries = Capability.expandContributions(result);
        expect(entries[0].implementation).toEqual({ total: 42 });
      }),
    );

    it('allows omitting an all-optional options object and defaults it to {}', () => {
      let seenOptions: { flag?: boolean } | undefined;
      const Test = Plugin.make(
        Plugin.define<{ flag?: boolean }>(testMeta).pipe(
          Plugin.addModule((options) => {
            seenOptions = options;
            return { id: 'optional-options', provides: [], activate: () => Effect.succeed([]) };
          }),
        ),
      );

      // No argument is accepted (the factory parameter is optional when `T` has no required
      // members); the module callback still receives a defined options object.
      const plugin = Test();
      expect(plugin.modules).toHaveLength(1);
      expect(seenOptions).toEqual({});
    });

    it('normalizes a module authored with activatesOn to event mode', () => {
      const Lazy = Capability.lazyModule(
        'Listener',
        { requires: [String], provides: [], activatesOn: CountEvent },
        () => Promise.resolve({ default: () => Effect.succeed([]) }),
      );
      const Test = Plugin.make(Plugin.define(testMeta).pipe(Plugin.addModule(Lazy)));
      const [module] = Test().modules;
      assert(module.activation.mode === 'event');
      expect(module.activation.activatesOn).toEqual(CountEvent);
      expect(module.activation.requires).toEqual([String]);
    });
  });
});
