//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { TracingService } from '@dxos/functions';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import * as Process from './Process';
import * as ServiceResolver from './ServiceResolver';
import { Database, Obj, Query } from '@dxos/echo';
import { Organization } from '@dxos/types';
import { TestDatabaseLayer } from '../testing';
import { ProcessManagerLayer } from './process-manager-impl';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { ProcessOperationInvoker } from './index';

const Double = Operation.make({
  meta: { key: 'test/double', name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const CreateOrg = Operation.make({
  meta: { key: 'org.example.create-organization', name: 'CreateOrganization' },
  input: Schema.String,
  output: Schema.String,
  services: [Database.Service],
});

const QueryOrgs = Operation.make({
  meta: { key: 'org.example.query-organizations', name: 'QueryOrganizations' },
  input: Schema.Void,
  output: Schema.Array(Organization.Organization),
  services: [Database.Service],
});

const handlers = OperationHandlerSet.make(
  Operation.withHandler(
    Double,
    Effect.fn(function* ({ value }) {
      return value * 2;
    }),
  ),
  Operation.withHandler(CreateOrg, Effect.fn(function* (input) {
    const org = yield* Database.add(Obj.make(Organization.Organization, { name: input }));
    return Obj.getDXN(org).toString();
  })),
  Operation.withHandler(QueryOrgs, Effect.fn(function* (input) {
    return yield* Database.runQuery(Query.type(Organization.Organization));
  })),
);

const TestLayer = ProcessOperationInvoker.layer.pipe(
  Layer.provideMerge(ProcessManagerLayer),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(TestDatabaseLayer({
    types: [Organization.Organization],
  })),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provide(TracingService.layerNoop),
)

describe('ProcessManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* Process.ManagerService;

      const handle = yield* manager.spawn(Process.makeOperationExecutable(Double));
      expect(handle.id).toBeDefined();

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

      yield* handle.submitInput({ value: 5 });

      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([10]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'operation invoker spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const result = yield* Operation.invoke(Double, { value: 5 });
      expect(result).toEqual(10);
    }, Effect.provide(TestLayer)),
  );
});
