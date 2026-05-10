//
// Copyright 2025 DXOS.org
//

import type * as ManagedRuntime from 'effect/ManagedRuntime';

import { type AiService, type OpaqueToolkit } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import type { Blueprint, Credential, Operation, OperationRegistry, Process } from '@dxos/compute';
import { type Database, type Feed } from '@dxos/echo';
import type { QueueService } from '@dxos/functions';
import { AgentService } from '@dxos/functions-runtime';
import type { ProcessManager, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';
import type { SpaceId } from '@dxos/keys';

import { meta } from '#meta';

export namespace AutomationCapabilities {
  /**
   * Service stack for executing agents, functions, and triggers.
   */
  export type ComputeServices =
    | TriggerDispatcher
    | TriggerStateStore
    | AiService.AiService
    | Database.Service
    | Feed.FeedService
    | QueueService
    | Credential.CredentialsService
    | Blueprint.RegistryService
    | AgentService.AgentService
    | Process.ProcessMonitorService
    | ProcessManager.Service
    | Operation.Service
    | OperationRegistry.Service
    | OpaqueToolkit.OpaqueToolkitProvider;

  export type ComputeRuntime = ManagedRuntime.ManagedRuntime<AutomationCapabilities.ComputeServices, never>;
  export interface ComputeRuntimeProvider {
    getRuntime(spaceId: SpaceId): ComputeRuntime;
  }

  /**
   * Runtime for executing agents, functions, and triggers.
   */
  export const ComputeRuntime = Capability.make<ComputeRuntimeProvider>(`${meta.id}.capability.compute-runtime`);
}
