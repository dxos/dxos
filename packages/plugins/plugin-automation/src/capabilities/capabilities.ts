//
// Copyright 2025 DXOS.org
//

import { type ManagedRuntime } from 'effect';

import { type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';
import type {
  CredentialsService,
  DatabaseService,
  FunctionImplementationResolver,
  InvocationTracer,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';

import { meta } from '../meta';

export namespace AutomationCapabilities {
  /**
   * Service stack for executing agents, functions, and triggers.
   */
  export type ComputeServices =
    | TriggerDispatcher
    | AiService.AiService
    | DatabaseService
    | QueueService
    | CredentialsService
    | LocalFunctionExecutionService
    | RemoteFunctionExecutionService
    // TODO(dmaretskyi): This service is private and shouldn't be exposed as a part of public API.
    | FunctionImplementationResolver
    | InvocationTracer
    | TriggerStateStore
    // TODO(dmaretskyi): Those should be provided at AI-chat call site.
    | ToolResolverService
    | ToolExecutionService;

  export interface ComputeRuntimeProvider {
    getRuntime(spaceId: SpaceId): ManagedRuntime.ManagedRuntime<ComputeServices, never>;
  }

  /**
   * Runtime for executing agents, functions, and triggers.
   */
  export const ComputeRuntime = defineCapability<ComputeRuntimeProvider>(`${meta.id}/capability/compute-runtime`);
}
