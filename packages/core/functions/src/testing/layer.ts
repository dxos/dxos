//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import type { Resource } from '@dxos/context';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { DatabaseService, QueueService } from '../services';
import type { EchoHostIndexingConfig } from '@dxos/echo-pipeline';
import type { Schema } from 'effect';

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

export type TestDatabaseOptions = {
  indexing?: Partial<EchoHostIndexingConfig>;
  types?: Schema.Schema.AnyNoContext[];
};

export const TestDatabaseLayer = ({ indexing, types }: TestDatabaseOptions = {}) =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const builder = yield* testBuilder;
      const { db, queues } = yield* Effect.promise(() => builder.createDatabase({ indexing, types }));
      return Context.mergeAll(
        Context.make(DatabaseService, DatabaseService.make(db)),
        Context.make(QueueService, QueueService.make(queues, undefined)),
      );
    }),
  );
