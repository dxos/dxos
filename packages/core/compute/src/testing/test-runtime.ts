//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiService } from '@dxos/ai';
import { type SpaceId } from '@dxos/client/echo';
import { Database, Feed } from '@dxos/echo';
import { CredentialsService, QueueService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest } from '@dxos/functions-runtime/testing';
import { OperationHandlerSet } from '@dxos/operation';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions,
}: { functions?: OperationHandlerSet.OperationHandlerSet } = {}): FunctionsRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) =>
      ManagedRuntime.make(
        FunctionInvocationServiceLayerTest({ functions }).pipe(
          Layer.provide(AiService.notAvailable),
          Layer.provide(CredentialsService.configuredLayer([])),
          Layer.provide(Database.notAvailable),
          Layer.provide(QueueService.notAvailable),
          Layer.provide(Feed.notAvailable),
        ),
      ),
  };
};
