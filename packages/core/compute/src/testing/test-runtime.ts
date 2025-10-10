//
// Copyright 2025 DXOS.org
//

import { ManagedRuntime } from 'effect';

import { type SpaceId } from '@dxos/client/echo';
import { type FunctionDefinition, FunctionInvocationService } from '@dxos/functions';
import { type AutomationCapabilities } from '@dxos/plugin-automation';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions,
}: { functions?: FunctionDefinition<any, any>[] } = {}): AutomationCapabilities.ComputeRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) => ManagedRuntime.make(FunctionInvocationService.layerTest({ functions }) as any),
  };
};
