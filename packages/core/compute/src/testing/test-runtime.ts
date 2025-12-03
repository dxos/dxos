//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiService } from '@dxos/ai';
import { type SpaceId } from '@dxos/client/echo';
import { CredentialsService, type FunctionDefinition, QueueService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest } from '@dxos/functions-runtime/testing';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';
import { Database } from '@dxos/echo';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions,
}: { functions?: FunctionDefinition.Any[] } = {}): FunctionsRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) =>
      ManagedRuntime.make(
        FunctionInvocationServiceLayerTest({ functions }).pipe(
          Layer.provide(AiService.notAvailable),
          Layer.provide(CredentialsService.configuredLayer([])),
          Layer.provide(Database.Service.notAvailable),
          Layer.provide(QueueService.notAvailable),
        ),
      ),
  };
};
