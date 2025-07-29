//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';
import type { Schema } from 'effect';

import type { Resource } from '@dxos/context';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import type { EchoHostIndexingConfig } from '@dxos/echo-pipeline';

import { DatabaseService, QueueService } from '../services';
import { accuireReleaseResource } from '@dxos/effect';

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
