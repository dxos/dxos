//
// Copyright 2025 DXOS.org
//

import type * as ManagedRuntime from 'effect/ManagedRuntime';

import { type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';
import type {
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  InvocationTracer,
  QueueService,
  TriggerDispatcher,
  TriggerStateStore,
  FunctionRegistryService,
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
    | FunctionInvocationService
    | FunctionRegistryService
    | InvocationTracer
    | TriggerStateStore
    // TODO(dmaretskyi): Those should be provided at AI-chat call site.
    | ToolResolverService
    | ToolExecutionService;

  export type ComputeRuntime = ManagedRuntime.ManagedRuntime<AutomationCapabilities.ComputeServices, never>;
  export interface ComputeRuntimeProvider {
    getRuntime(spaceId: SpaceId): ComputeRuntime;
  }

  /**
   * Runtime for executing agents, functions, and triggers.
   */
  export const ComputeRuntime = defineCapability<ComputeRuntimeProvider>(`${meta.id}/capability/compute-runtime`);
}
