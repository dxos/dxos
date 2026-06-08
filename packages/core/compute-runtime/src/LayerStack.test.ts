//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';

import { LayerSpec, ServiceNotAvailableError } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import * as LayerStack from './LayerStack';

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

        const stack = new LayerStack.LayerStack({ layers: [layer] });
        const resolver = stack.getServiceResolver();

        const resolved = yield* resolveWithScope(resolver.resolve(ServiceA, {}));
        expect(resolved).toEqual({ value: 'a' });
      }),
    );

    it.effect(
      'fails with ServiceNotAvailableError for unknown service',
      Effect.fn(function* ({ expect }) {
        const stack = new LayerStack.LayerStack({ layers: [] });
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
        const stack = new LayerStack.LayerStack({ layers: [layerB, layerA] });
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

        const stack = new LayerStack.LayerStack({ layers: [layer] });
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

        const stack = new LayerStack.LayerStack({ layers: [layer] });
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

        const stack = new LayerStack.LayerStack({ layers: [layer] });
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

        const stack = new LayerStack.LayerStack({ layers: [appLayer, spaceLayer] });
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

        const stack = new LayerStack.LayerStack({ layers: [spaceLayer, processLayer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        const process = 'pid-1' as any;
        const resolved = yield* resolveWithScope(resolver.resolve(ServiceB, { space, process }));
        expect(resolved).toEqual({ value: `process(space:${space}):pid-1` });
      }),
    );

    it.effect(
      'process slice initialises even when an unrelated process-affinity spec has unsatisfied requirements',
      Effect.fn(function* ({ expect }) {
        // Self-sufficient spec — provides ServiceA without requiring anything
        // from a lower-affinity slice. This stands in for an op like
        // `update-complementary` that needs nothing space-scoped.
        const selfSufficient = LayerSpec.make(
          {
            affinity: 'process',
            requires: [],
            provides: [ServiceA],
          },
          () => Layer.succeed(ServiceA, { value: 'self-sufficient' }),
        );

        // Spec that requires a space-affinity service (ServiceC). When the
        // resolver is invoked for a process context with no `space`, the
        // space slice can't materialise ServiceC. Previously this would fail
        // the entire process slice init — including the unrelated
        // `selfSufficient` spec. Now the LayerStack must drop just this spec
        // so the slice still serves other tags.
        const spaceDependent = LayerSpec.make(
          {
            affinity: 'process',
            requires: [ServiceC],
            provides: [ServiceB],
          },
          () =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                const c = yield* ServiceC;
                return { value: `space-dependent:${c.value}` };
              }),
            ),
        );

        const spaceService = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceC],
          },
          (ctx) => Layer.succeed(ServiceC, { value: `space:${ctx.space}` }),
        );

        const stack = new LayerStack.LayerStack({ layers: [selfSufficient, spaceDependent, spaceService] });
        const resolver = stack.getServiceResolver();

        // No space context — `spaceDependent`'s requirement cannot be met.
        // `selfSufficient` must still resolve successfully.
        const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { process: 'p1' as any }));
        expect(resolvedA).toEqual({ value: 'self-sufficient' });

        // Asking for the actually-unavailable tag fails with a precise
        // `ServiceNotAvailable` for THAT tag, not for the missing dependency.
        const exit = yield* resolveWithScope(resolver.resolve(ServiceB, { process: 'p1' as any })).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        const failureText = String(
          Exit.match(exit, {
            onFailure: (cause) => cause,
            onSuccess: () => '',
          }),
        );
        expect(failureText).toContain('ServiceNotAvailable');
        expect(failureText).toContain('test/ServiceB');
        expect(failureText).toContain('provider spec pruned due to missing deps');
        expect(failureText).toContain('test/ServiceC');
        expect(failureText).toContain('space=<missing>');

        // With a space context the same `spaceDependent` spec can resolve.
        // Different process id → separate process slice that gets to use the
        // satisfied space slice this time around.
        const space = SpaceId.random();
        const resolvedB = yield* resolveWithScope(resolver.resolve(ServiceB, { space, process: 'p2' as any }));
        expect(resolvedB).toEqual({ value: `space-dependent:space:${space}` });
      }),
    );

    it.effect(
      'does not materialise conversation-scoped specs when resolving unrelated services',
      Effect.fn(function* ({ expect }) {
        let conversationSpecConstructions = 0;

        // Mirrors `sync-triggers`: process op that only needs a space-affinity service.
        const opLayer = LayerSpec.make(
          {
            affinity: 'process',
            requires: [ServiceC],
            provides: [ServiceA],
          },
          () =>
            Layer.effect(
              ServiceA,
              Effect.gen(function* () {
                const spaceService = yield* ServiceC;
                return { value: `op:${spaceService.value}` };
              }),
            ),
        );

        // Mirrors `AiContextSpec`: same space deps, but only valid with `conversation`.
        const conversationScoped = LayerSpec.make(
          {
            affinity: 'process',
            requires: [ServiceC],
            provides: [ServiceB],
          },
          (context) =>
            Layer.effect(
              ServiceB,
              Effect.gen(function* () {
                conversationSpecConstructions++;
                if (!context.conversation) {
                  return yield* Effect.die(
                    new ServiceNotAvailableError('test/ServiceB', {
                      message: 'conversation-scoped spec materialised without conversation',
                    }),
                  );
                }
                const spaceService = yield* ServiceC;
                return { value: `conversation:${spaceService.value}:${context.conversation}` };
              }),
            ),
        );

        const spaceService = LayerSpec.make(
          {
            affinity: 'space',
            requires: [],
            provides: [ServiceC],
          },
          (ctx) => Layer.succeed(ServiceC, { value: `space:${ctx.space}` }),
        );

        const stack = new LayerStack.LayerStack({ layers: [opLayer, conversationScoped, spaceService] });
        const resolver = stack.getServiceResolver();
        const space = SpaceId.random();
        const process = 'sync-triggers' as any;

        // Op only declares `Database.Service` — resolved from the space slice.
        const resolvedSpace = yield* resolveWithScope(resolver.resolve(ServiceC, { space, process }));
        expect(resolvedSpace).toEqual({ value: `space:${space}` });
        expect(conversationSpecConstructions).toBe(0);

        // Another unrelated process tag with satisfied space deps must not touch conversation spec.
        const resolvedOp = yield* resolveWithScope(resolver.resolve(ServiceA, { space, process }));
        expect(resolvedOp).toEqual({ value: `op:space:${space}` });
        expect(conversationSpecConstructions).toBe(0);

        // Only when the conversation-scoped tag is actually requested does its factory run.
        const exit = yield* resolveWithScope(resolver.resolve(ServiceB, { space, process })).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        expect(conversationSpecConstructions).toBe(1);
        const failureText = String(
          Exit.match(exit, {
            onFailure: (cause) => cause,
            onSuccess: () => '',
          }),
        );
        expect(failureText).toContain('ServiceNotAvailable');
        expect(failureText).toContain('test/ServiceB');

        // With conversation present the same tag resolves successfully.
        const conversation = 'dxn:queue:test-feed' as any;
        const resolvedConversation = yield* resolveWithScope(
          resolver.resolve(ServiceB, { space, conversation, process: 'agent' as any }),
        );
        expect(resolvedConversation).toEqual({
          value: `conversation:space:${space}:${conversation}`,
        });
      }),
    );

    it.effect(
      'materialising a second tag in the same slice does not re-run prior factories',
      Effect.fn(function* ({ expect }) {
        let serviceAConstructions = 0;
        let serviceBConstructions = 0;
        let serviceCConstructions = 0;

        const layerA = LayerSpec.make({ affinity: 'process', requires: [], provides: [ServiceA] }, () =>
          Layer.effect(
            ServiceA,
            Effect.sync(() => {
              serviceAConstructions++;
              return { value: 'a' };
            }),
          ),
        );
        const layerB = LayerSpec.make({ affinity: 'process', requires: [], provides: [ServiceB] }, () =>
          Layer.effect(
            ServiceB,
            Effect.sync(() => {
              serviceBConstructions++;
              return { value: 'b' };
            }),
          ),
        );
        const layerC = LayerSpec.make({ affinity: 'process', requires: [], provides: [ServiceC] }, () =>
          Layer.effect(
            ServiceC,
            Effect.sync(() => {
              serviceCConstructions++;
              return { value: 'c' };
            }),
          ),
        );

        const stack = new LayerStack.LayerStack({ layers: [layerA, layerB, layerC] });
        const resolver = stack.getServiceResolver();
        const process = 'p-multi' as any;

        yield* resolveWithScope(resolver.resolve(ServiceA, { process }));
        yield* resolveWithScope(resolver.resolve(ServiceB, { process }));
        yield* resolveWithScope(resolver.resolve(ServiceC, { process }));

        expect(serviceAConstructions).toBe(1);
        expect(serviceBConstructions).toBe(1);
        expect(serviceCConstructions).toBe(1);
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

        const stack = new LayerStack.LayerStack({ layers: [appLayer, spaceLayer, processLayer] });
        const resolver = stack.getServiceResolver();

        const space = SpaceId.random();
        // Materialise each affinity once, then resolve again from a second process context.
        yield* resolveWithScope(resolver.resolve(ServiceA, {}));
        yield* resolveWithScope(resolver.resolve(ServiceA, {}));
        yield* resolveWithScope(resolver.resolve(ServiceB, { space }));
        yield* resolveWithScope(resolver.resolve(ServiceB, { space }));
        yield* resolveWithScope(resolver.resolve(ServiceC, { space, process: 'p1' as any }));
        yield* resolveWithScope(resolver.resolve(ServiceC, { space, process: 'p2' as any }));

        // Lazy materialisation: factories run once per slice, not at slice init.
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

      const stack = new LayerStack.LayerStack({ layers: [layerA, layerB] });
      const resolver = stack.getServiceResolver();

      // Cycle is detected eagerly inside the Slice constructor (which runs during resolution).
      return EffectEx.runAndForwardErrors(resolveWithScope(resolver.resolve(ServiceA, {})).pipe(Effect.exit)).then(
        (exit) => {
          expect(Exit.isFailure(exit)).toBe(true);
        },
      );
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
        const stack = new LayerStack.LayerStack({ layers: [layerD, layerB, layerA, layerC] });
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

        const stack = new LayerStack.LayerStack({ layers: [layer] });
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

      const stack = new LayerStack.LayerStack({ layers: [layer] });
      const resolver = stack.getServiceResolver();

      // ServiceB is not provided by any registered layer.
      const exit = yield* resolveWithScope(resolver.resolve(ServiceB, {})).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
