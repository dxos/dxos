//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';

import { LayerSpec, ServiceNotAvailableError } from '@dxos/functions';
import { SpaceId } from '@dxos/keys';

import { LayerStack } from './LayerStack';

//
// Test service tags.
//

class ServiceA extends Context.Tag('test/ServiceA')<ServiceA, { readonly value: string }>() {}
class ServiceB extends Context.Tag('test/ServiceB')<ServiceB, { readonly value: string }>() {}
class ServiceC extends Context.Tag('test/ServiceC')<ServiceC, { readonly value: string }>() {}
class ServiceD extends Context.Tag('test/ServiceD')<ServiceD, { readonly value: string }>() {}

/**
 * Helpers.
 */
const resolveWithScope = <A, E>(effect: Effect.Effect<A, E, Scope.Scope>) =>
  Effect.scoped(effect) as Effect.Effect<A, E, never>;

describe('LayerStack', () => {
  describe('application-affinity resolution', () => {
    it.effect(
      'resolves a single service provided by an application-affinity layer',
      Effect.fn(function* ({ expect }) {
        const layer = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () => Layer.succeed(ServiceA, { value: 'a' }),
        );

        const stack = new LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        const resolved = yield* resolveWithScope(resolver.resolve(ServiceA, {}));
        expect(resolved).toEqual({ value: 'a' });
      }),
    );

    it.effect(
      'fails with ServiceNotAvailableError for unknown service',
      Effect.fn(function* ({ expect }) {
        const stack = new LayerStack({ layers: [] });
        const resolver = stack.getServiceResolver();

        const exit = yield* resolveWithScope(resolver.resolve(ServiceA, {})).pipe(Effect.exit);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const failure = Exit.match(exit, {
            onFailure: (cause) => cause,
            onSuccess: () => null,
          });
          expect(String(failure)).toContain('ServiceNotAvailable');
        }
      }),
    );

    it.effect(
      'resolves layers with cross-dependencies within the same affinity',
      Effect.fn(function* ({ expect }) {
        // ServiceB depends on ServiceA (both application-affinity).
        const layerA = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () => Layer.succeed(ServiceA, { value: 'a' }),
        );
        const layerB = LayerSpec.make(
          {
            affinity: 'application',
            requires: [ServiceA],
            provides: [ServiceB],
          },
          () =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                const a = yield* ServiceA;
                return { value: `b(${a.value})` };
              }),
            ),
        );

        // Intentionally register layerB before layerA: the topological sort should reorder them.
        const stack = new LayerStack({ layers: [layerB, layerA] });
        const resolver = stack.getServiceResolver();

        const resolved = yield* resolveWithScope(resolver.resolve(ServiceB, {}));
        expect(resolved).toEqual({ value: 'b(a)' });
      }),
    );

    it.effect(
      'caches application slice across resolutions (layer runs once)',
      Effect.fn(function* ({ expect }) {
        let constructions = 0;
        const layer = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () =>
            Layer.effect(
              ServiceA,
              Effect.sync(() => {
                constructions++;
                return { value: `a#${constructions}` };
              }),
            ),
        );

        const stack = new LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        const first = yield* resolveWithScope(resolver.resolve(ServiceA, {}));
        const second = yield* resolveWithScope(resolver.resolve(ServiceA, {}));

        expect(constructions).toBe(1);
        expect(first).toEqual(second);
      }),
    );
  });

  describe('space-affinity resolution', () => {
    it.effect(
      'resolves a space-affinity service when space context is provided',
      Effect.fn(function* ({ expect }) {
        const layer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceA],
          },
          (ctx) => Layer.succeed(ServiceA, { value: `space:${ctx.space}` }),
        );

        const stack = new LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        const resolved = yield* resolveWithScope(resolver.resolve(ServiceA, { space }));
        expect(resolved).toEqual({ value: `space:${space}` });
      }),
    );

    it.effect(
      'creates separate slices per space',
      Effect.fn(function* ({ expect }) {
        let constructions = 0;
        const layer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceA],
          },
          (ctx) =>
            Layer.effect(
              ServiceA,
              Effect.sync(() => {
                constructions++;
                return { value: `space:${ctx.space}` };
              }),
            ),
        );

        const stack = new LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        const spaceA = SpaceId.random();
        const spaceB = SpaceId.random();
        const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { space: spaceA }));
        const resolvedB = yield* resolveWithScope(resolver.resolve(ServiceA, { space: spaceB }));

        expect(constructions).toBe(2);
        expect(resolvedA).toEqual({ value: `space:${spaceA}` });
        expect(resolvedB).toEqual({ value: `space:${spaceB}` });
      }),
    );

    it.effect(
      'resolves a space-affinity service that depends on an application-affinity service',
      Effect.fn(function* ({ expect }) {
        const appLayer = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () => Layer.succeed(ServiceA, { value: 'shared' }),
        );
        const spaceLayer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [ServiceA],
            provides: [ServiceB],
          },
          (ctx) =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                const a = yield* ServiceA;
                return { value: `${a.value}:${ctx.space}` };
              }),
            ),
        );

        const stack = new LayerStack({ layers: [appLayer, spaceLayer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        const resolved = yield* resolveWithScope(resolver.resolve(ServiceB, { space }));
        expect(resolved).toEqual({ value: `shared:${space}` });
      }),
    );
  });

  describe('process-affinity resolution', () => {
    it.effect(
      'resolves a process-affinity service that depends on a space-affinity service',
      Effect.fn(function* ({ expect }) {
        const spaceLayer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceA],
          },
          (ctx) => Layer.succeed(ServiceA, { value: `space:${ctx.space}` }),
        );
        const processLayer = LayerSpec.make(
          {
            affinity: 'process',
            requires: [ServiceA],
            provides: [ServiceB],
          },
          (ctx) =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                const a = yield* ServiceA;
                return { value: `process(${a.value}):${ctx.process}` };
              }),
            ),
        );

        const stack = new LayerStack({ layers: [spaceLayer, processLayer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        const process = 'pid-1' as any;
        const resolved = yield* resolveWithScope(resolver.resolve(ServiceB, { space, process }));
        expect(resolved).toEqual({ value: `process(space:${space}):pid-1` });
      }),
    );

    it.effect(
      'reuses application and space slices across resolutions for different processes',
      Effect.fn(function* ({ expect }) {
        let appConstructions = 0;
        let spaceConstructions = 0;
        let processConstructions = 0;

        const appLayer = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () =>
            Layer.effect(
              ServiceA,
              Effect.sync(() => {
                appConstructions++;
                return { value: 'a' };
              }),
            ),
        );
        const spaceLayer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceB],
          },
          (ctx) =>
            Layer.effect(
              ServiceB,
              Effect.sync(() => {
                spaceConstructions++;
                return { value: `space:${ctx.space}` };
              }),
            ),
        );
        const processLayer = LayerSpec.make(
          {
            affinity: 'process',
            requires: [],
            provides: [ServiceC],
          },
          (ctx) =>
            Layer.effect(
              ServiceC,
              Effect.sync(() => {
                processConstructions++;
                return { value: `process:${ctx.process}` };
              }),
            ),
        );

        const stack = new LayerStack({ layers: [appLayer, spaceLayer, processLayer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        // Resolve process-affinity service twice with different process contexts.
        yield* resolveWithScope(resolver.resolve(ServiceC, { space, process: 'p1' as any }));
        yield* resolveWithScope(resolver.resolve(ServiceC, { space, process: 'p2' as any }));

        // Application and space slices should be instantiated exactly once.
        expect(appConstructions).toBe(1);
        expect(spaceConstructions).toBe(1);
        // Process slices should be instantiated per process.
        expect(processConstructions).toBe(2);
      }),
    );
  });

  describe('layer sorting and validation', () => {
    it('throws on a dependency cycle within a single affinity', ({ expect }) => {
      // ServiceA requires ServiceB and vice versa — cycle at sort time.
      const layerA = LayerSpec.make(
        {
          affinity: 'application',
          requires: [ServiceB],
          provides: [ServiceA],
        },
        () =>
          Layer.effect(
            ServiceA,
            Effect.gen(function* () {
              const b = yield* ServiceB;
              return { value: `a(${b.value})` };
            }),
          ),
      );
      const layerB = LayerSpec.make(
        {
          affinity: 'application',
          requires: [ServiceA],
          provides: [ServiceB],
        },
        () =>
          Layer.effect(
            ServiceB,
            Effect.gen(function* () {
              const a = yield* ServiceA;
              return { value: `b(${a.value})` };
            }),
          ),
      );

      const stack = new LayerStack({ layers: [layerA, layerB] });
      const resolver = stack.getServiceResolver();

      // Cycle is detected eagerly inside the Slice constructor (which runs during resolution).
      return Effect.runPromise(resolveWithScope(resolver.resolve(ServiceA, {})).pipe(Effect.exit)).then((exit) => {
        expect(Exit.isFailure(exit)).toBe(true);
      });
    });

    it.effect(
      'resolves layers declared in arbitrary order via topological sort',
      Effect.fn(function* ({ expect }) {
        // Dependency chain: A -> B -> C -> D (D depends on C, C on B, B on A).
        const layerA = LayerSpec.make(
          {
            affinity: 'application',
            requires: [],
            provides: [ServiceA],
          },
          () => Layer.succeed(ServiceA, { value: 'a' }),
        );
        const layerB = LayerSpec.make(
          {
            affinity: 'application',
            requires: [ServiceA],
            provides: [ServiceB],
          },
          () =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                const a = yield* ServiceA;
                return { value: `b(${a.value})` };
              }),
            ),
        );
        const layerC = LayerSpec.make(
          {
            affinity: 'application',
            requires: [ServiceB],
            provides: [ServiceC],
          },
          () =>
            Layer.effect(
              ServiceC,
              Effect.gen(function* () {
                const b = yield* ServiceB;
                return { value: `c(${b.value})` };
              }),
            ),
        );
        const layerD = LayerSpec.make(
          {
            affinity: 'application',
            requires: [ServiceC],
            provides: [ServiceD],
          },
          () =>
            Layer.effect(
              ServiceD,
              Effect.gen(function* () {
                const c = yield* ServiceC;
                return { value: `d(${c.value})` };
              }),
            ),
        );

        // Shuffle the order: D, B, A, C.
        const stack = new LayerStack({ layers: [layerD, layerB, layerA, layerC] });
        const resolver = stack.getServiceResolver();

        const resolved = yield* resolveWithScope(resolver.resolve(ServiceD, {}));
        expect(resolved).toEqual({ value: 'd(c(b(a)))' });
      }),
    );
  });

  describe('context validation', () => {
    it.effect(
      'fails when a space-affinity service is requested without a space context',
      Effect.fn(function* ({ expect }) {
        const layer = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceA],
          },
          (ctx) => Layer.succeed(ServiceA, { value: `space:${ctx.space}` }),
        );

        const stack = new LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        // No `space` in the context — the resolver should not find the service.
        const exit = yield* resolveWithScope(resolver.resolve(ServiceA, {})).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
      }),
    );
  });

  it.effect(
    'returns failure for a tag that is not provided by any layer',
    Effect.fn(function* ({ expect }) {
      const layer = LayerSpec.make(
        {
          affinity: 'application',
          requires: [],
          provides: [ServiceA],
        },
        () => Layer.succeed(ServiceA, { value: 'a' }),
      );

      const stack = new LayerStack({ layers: [layer] });
      const resolver = stack.getServiceResolver();

      // ServiceB is not provided by any registered layer.
      const exit = yield* resolveWithScope(resolver.resolve(ServiceB, {})).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
