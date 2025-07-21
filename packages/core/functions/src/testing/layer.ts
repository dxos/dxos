import { Context, Effect, Layer } from 'effect';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import type { Resource } from '@dxos/context';
import { DatabaseService, QueueService } from '../services';

// TODO(dmaretskyi): Extract to effect-utils.
const accuireReleaseResource = <T extends Resource>(getResource: () => T) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const resource = getResource();
      yield* Effect.promise(() => resource.open());
      return resource;
    }),
    (resource) => Effect.promise(() => resource.close()),
  );

const testBuilder = accuireReleaseResource(() => new EchoTestBuilder());

export const TestDatabaseLayer = Layer.scopedContext(
  Effect.gen(function* () {
    const builder = yield* testBuilder;
    const { db, queues } = yield* Effect.promise(() => builder.createDatabase());
    return Context.mergeAll(
      Context.make(DatabaseService, DatabaseService.make(db)),
      Context.make(QueueService, QueueService.make(queues, undefined)),
    );
  }),
);
