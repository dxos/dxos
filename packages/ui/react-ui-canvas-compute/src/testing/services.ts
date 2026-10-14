//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { configuredCredentialsLayer } from '@dxos/compute-runtime';
import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { registryLayerNoop } from '@dxos/echo/testing';

import { type ComputeGraphRuntime } from '../graph/controller.ts';

/** No operations run in a story: every call dies or reports the error. */
const operations: Operation.OperationService = {
  invoke: () => Effect.die('Operation.Service not available in test.'),
  schedule: () => Effect.die('Operation.Service not available in test.'),
  invokePromise: async () => ({ error: new Error('Not available') }),
};

/** The services a story's controller runs against: a direct AI preset, a test database, no operations. */
const StoryServiceLayer = Layer.empty.pipe(
  Layer.provideMerge(Layer.mergeAll(Layer.succeed(Operation.Service, operations), registryLayerNoop)),
  Layer.provideMerge(
    Layer.mergeAll(AiServiceTestingPreset('direct'), TestDatabaseLayer(), configuredCredentialsLayer([])),
  ),
  Layer.orDie,
);

/** A runtime over the story services, typed as what the controller takes so the layer's type stays private. */
export const createStoryRuntime = (): ComputeGraphRuntime => ManagedRuntime.make(StoryServiceLayer);
