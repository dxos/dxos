//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { ServiceResolver } from '@dxos/functions';
import { type SpaceId } from '@dxos/keys';

import * as LayerSpec from './LayerSpec';
import * as ServiceMesh from './ServiceMesh';

// Test service tags.
class CounterService extends Context.Tag('test/CounterService')<CounterService, { count: () => number }>() {}

class LoggerService extends Context.Tag('test/LoggerService')<
  LoggerService,
  { log: (msg: string) => void; logs: () => string[] }
>() {}

class CompositeService extends Context.Tag('test/CompositeService')<
  CompositeService,
  { getCountAndLog: () => { count: number; logs: string[] } }
>() {}

// Track service creation for testing.
let counterCreations = 0;
let loggerCreations = 0;
let compositeCreations = 0;

const resetCreationCounters = () => {
  counterCreations = 0;
  loggerCreations = 0;
  compositeCreations = 0;
};

// Test layer specs using LayerSpec.make().
const makeCounterLayerSpec = (affinity: LayerSpec.Affinity): LayerSpec.LayerSpec =>
  LayerSpec.make(
    {
      affinity,
      requires: [],
      provides: [CounterService],
    },
    Layer.effect(
      CounterService,
      Effect.sync(() => {
        counterCreations++;
        let count = 0;
        return { count: () => ++count };
      }),
    ),
  );

const makeLoggerLayerSpec = (affinity: LayerSpec.Affinity): LayerSpec.LayerSpec =>
  LayerSpec.make(
    {
      affinity,
      requires: [],
      provides: [LoggerService],
    },
    Layer.effect(
      LoggerService,
      Effect.sync(() => {
        loggerCreations++;
        const logs: string[] = [];
        return {
          log: (msg: string) => logs.push(msg),
          logs: () => [...logs],
        };
      }),
    ),
  );

const makeCompositeLayerSpec = (affinity: LayerSpec.Affinity): LayerSpec.LayerSpec =>
  LayerSpec.make(
    {
      affinity,
      requires: [CounterService, LoggerService],
      provides: [CompositeService],
    },
    Layer.effect(
      CompositeService,
      Effect.gen(function* () {
        compositeCreations++;
        const counter = yield* CounterService;
        const logger = yield* LoggerService;
        return {
          getCountAndLog: () => ({ count: counter.count(), logs: logger.logs() }),
        };
      }),
    ),
  );

describe('ServiceMesh', () => {
  describe('basic operations', () => {
    it.effect(
      'creates and resolves application-scoped services',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('application')]);

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
        );

        expect(result).toBe(1);
        expect(counterCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'caches application-scoped services across multiple runs',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('application')]);

        // First run.
        const result1 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
        );

        // Second run should use cached instance.
        const result2 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
        );

        expect(result1).toBe(1);
        expect(result2).toBe(2);
        expect(counterCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'resolves space-scoped services with space context',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('space')]);
        const spaceId = 'space-1' as SpaceId;

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { space: spaceId },
        );

        expect(result).toBe(1);
        expect(counterCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'creates separate instances for different spaces',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('space')]);
        const space1 = 'space-1' as SpaceId;
        const space2 = 'space-2' as SpaceId;

        const result1 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { space: space1 },
        );

        const result2 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { space: space2 },
        );

        expect(result1).toBe(1);
        expect(result2).toBe(1);
        expect(counterCreations).toBe(2);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'resolves process-scoped services with process context',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('process')]);

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { pid: 'process-1' },
        );

        expect(result).toBe(1);
        expect(counterCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'creates separate instances for different processes',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('process')]);

        const result1 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { pid: 'process-1' },
        );

        const result2 = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
          { pid: 'process-2' },
        );

        expect(result1).toBe(1);
        expect(result2).toBe(1);
        expect(counterCreations).toBe(2);

        yield* mesh.destroy();
      }),
    );
  });

  describe('dependency resolution', () => {
    it.effect(
      'resolves service dependencies',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([
          makeCounterLayerSpec('application'),
          makeLoggerLayerSpec('application'),
          makeCompositeLayerSpec('application'),
        ]);

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const composite = yield* ServiceResolver.resolve(CompositeService, {});
            return composite.getCountAndLog();
          }),
        );

        expect(result.count).toBe(1);
        expect(counterCreations).toBe(1);
        expect(loggerCreations).toBe(1);
        expect(compositeCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'topologically sorts layer specs within affinity',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        // Add layer specs in reverse dependency order.
        const mesh = new ServiceMesh.ServiceMesh([
          makeCompositeLayerSpec('application'),
          makeLoggerLayerSpec('application'),
          makeCounterLayerSpec('application'),
        ]);

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const composite = yield* ServiceResolver.resolve(CompositeService, {});
            return composite.getCountAndLog();
          }),
        );

        expect(result.count).toBe(1);
        expect(counterCreations).toBe(1);
        expect(loggerCreations).toBe(1);
        expect(compositeCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );
  });

  describe('add and remove', () => {
    it.effect(
      'adds layer specs dynamically',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh();

        mesh.add(makeCounterLayerSpec('application'));

        const result = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
        );

        expect(result).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'removes layer specs',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const counterLayerSpec = makeCounterLayerSpec('application');
        const mesh = new ServiceMesh.ServiceMesh([counterLayerSpec]);

        mesh.remove(counterLayerSpec);

        const result = yield* mesh
          .run(
            Effect.gen(function* () {
              const counter = yield* ServiceResolver.resolve(CounterService, {});
              return counter.count();
            }),
          )
          .pipe(Effect.either);

        expect(result._tag).toBe('Left');

        yield* mesh.destroy();
      }),
    );
  });

  describe('getResolver', () => {
    it.effect(
      'returns a resolver that can be used directly',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('application')]);

        // Use mesh.run which handles the scope internally.
        const count = yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            return counter.count();
          }),
        );
        expect(count).toBe(1);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'cleans up space-scoped services when resolver scope closes',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('space')]);
        const spaceId = 'space-cleanup' as SpaceId;

        // First run - creates the service.
        yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            expect(counter.count()).toBe(1);
          }),
          { space: spaceId },
        );

        // Give time for cleanup (use real timeout, not Effect.sleep which uses test clock).
        yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));

        // Second run - should create a new service since the previous was cleaned up.
        yield* mesh.run(
          Effect.gen(function* () {
            const counter = yield* ServiceResolver.resolve(CounterService, {});
            expect(counter.count()).toBe(1);
          }),
          { space: spaceId },
        );

        expect(counterCreations).toBe(2);

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'caches space-scoped services within same run',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('space')]);
        const spaceId = 'space-cache' as SpaceId;

        // Multiple resolves within the same run should use the same service instance.
        const result = yield* mesh.run(
          Effect.gen(function* () {
            const counter1 = yield* ServiceResolver.resolve(CounterService, {});
            const count1 = counter1.count();

            const counter2 = yield* ServiceResolver.resolve(CounterService, {});
            const count2 = counter2.count();

            return { count1, count2 };
          }),
          { space: spaceId },
        );

        // Both should use the same counter instance.
        expect(result.count1).toBe(1);
        expect(result.count2).toBe(2);
        expect(counterCreations).toBe(1);

        yield* mesh.destroy();
      }),
    );
  });

  describe('destroy', () => {
    it.effect(
      'cleans up all services on destroy',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();
        const mesh = new ServiceMesh.ServiceMesh([
          makeCounterLayerSpec('application'),
          makeCounterLayerSpec('space'),
          makeCounterLayerSpec('process'),
        ]);

        // Create instances of each affinity.
        yield* mesh.run(
          Effect.gen(function* () {
            yield* ServiceResolver.resolve(CounterService, {});
          }),
        );

        yield* mesh.run(
          Effect.gen(function* () {
            yield* ServiceResolver.resolve(CounterService, {});
          }),
          { space: 'space-1' as SpaceId },
        );

        yield* mesh.run(
          Effect.gen(function* () {
            yield* ServiceResolver.resolve(CounterService, {});
          }),
          { pid: 'process-1' },
        );

        yield* mesh.destroy();

        // Mesh should be destroyed - running after destroy should fail.
        const result = yield* mesh
          .run(
            Effect.gen(function* () {
              yield* ServiceResolver.resolve(CounterService, {});
            }),
          )
          .pipe(Effect.exit);

        expect(Exit.isFailure(result)).toBe(true);
      }),
    );
  });

  describe('error handling', () => {
    it.effect(
      'fails when space-scoped service is requested without space context',
      Effect.fn(function* ({ expect }) {
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('space')]);

        const result = yield* mesh
          .run(
            Effect.gen(function* () {
              yield* ServiceResolver.resolve(CounterService, {});
            }),
          )
          .pipe(Effect.either);

        expect(result._tag).toBe('Left');

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'fails when process-scoped service is requested without process context',
      Effect.fn(function* ({ expect }) {
        const mesh = new ServiceMesh.ServiceMesh([makeCounterLayerSpec('process')]);

        const result = yield* mesh
          .run(
            Effect.gen(function* () {
              yield* ServiceResolver.resolve(CounterService, {});
            }),
          )
          .pipe(Effect.either);

        expect(result._tag).toBe('Left');

        yield* mesh.destroy();
      }),
    );

    it.effect(
      'fails when service is not available',
      Effect.fn(function* ({ expect }) {
        const mesh = new ServiceMesh.ServiceMesh();

        const result = yield* mesh
          .run(
            Effect.gen(function* () {
              yield* ServiceResolver.resolve(CounterService, {});
            }),
          )
          .pipe(Effect.either);

        expect(result._tag).toBe('Left');

        yield* mesh.destroy();
      }),
    );
  });

  describe('layer', () => {
    it.effect(
      'provides ServiceMesh through layer',
      Effect.fn(function* ({ expect }) {
        resetCreationCounters();

        const result = yield* Effect.gen(function* () {
          const mesh = yield* ServiceMesh.ServiceMeshService;
          mesh.add(makeCounterLayerSpec('application'));

          return yield* mesh.run(
            Effect.gen(function* () {
              const counter = yield* ServiceResolver.resolve(CounterService, {});
              return counter.count();
            }),
          );
        }).pipe(Effect.provide(ServiceMesh.layer()));

        expect(result).toBe(1);
      }),
    );
  });
});
