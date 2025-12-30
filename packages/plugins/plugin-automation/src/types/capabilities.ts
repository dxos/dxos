//
// Copyright 2025 DXOS.org
//

import type * as ManagedRuntime from 'effect/ManagedRuntime';

import { type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { type Database } from '@dxos/echo';
import type { CredentialsService, FunctionInvocationService, QueueService } from '@dxos/functions';
import type { InvocationTracer, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';
import type { SpaceId } from '@dxos/keys';

import { meta } from '../meta';

export namespace AutomationCapabilities {
  /**
   * Service stack for executing agents, functions, and triggers.
   */
  export type ComputeServices =
    | TriggerDispatcher
    | TriggerStateStore
    | AiService.AiService
    | Database.Service
    | QueueService
    | CredentialsService
    | FunctionInvocationService
    | InvocationTracer
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
  export const ComputeRuntime = Capability.make<ComputeRuntimeProvider>(`${meta.id}/capability/compute-runtime`);
}
