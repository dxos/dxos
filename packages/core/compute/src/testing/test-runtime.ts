//
// Copyright 2025 DXOS.org
//

import { Layer, ManagedRuntime } from 'effect';

import { AiService } from '@dxos/ai';
import { type SpaceId } from '@dxos/client/echo';
import {
  CredentialsService,
  DatabaseService,
  type FunctionDefinition,
  FunctionInvocationService,
  QueueService,
} from '@dxos/functions';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions,
}: { functions?: FunctionDefinition<any, any>[] } = {}): FunctionsRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) =>
      ManagedRuntime.make(
        FunctionInvocationService.layerTest({ functions }).pipe(
          Layer.provide(AiService.notAvailable),
          Layer.provide(CredentialsService.configuredLayer([])),
          Layer.provide(DatabaseService.notAvailable),
          Layer.provide(QueueService.notAvailable),
        ),
      ),
  };
};
