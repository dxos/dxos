//
// Copyright 2025 DXOS.org
//

import { type Layer, ManagedRuntime } from 'effect';

import { type AiService, type AiServiceRouter, ToolResolverService, ToolExecutionService } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';
import { type Assistant } from '../types';
import type {
  FunctionImplementationResolver,
  LocalFunctionExecutionService,
  RemoteFunctionExecutionService,
  CredentialsService,
  QueueService,
  DatabaseService,
  TracingService,
  ComputeEventLogger,
  TriggerDispatcher,
} from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';

export namespace AssistantCapabilities {
  export type AssistantState = {
    /** Map of primary object fq id to current chat. */
    currentChat: Record<string, Assistant.Chat>;
  };
  export const State = defineCapability<DeepReadonly<AssistantState>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<AssistantState>(`${meta.id}/capability/state`);

  export type AiServiceLayer = Layer.Layer<AiService.AiService>;
  export const AiServiceLayer = defineCapability<AiServiceLayer>(`${meta.id}/capability/ai-service-factory`);

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = defineCapability<Layer.Layer<AiServiceRouter.AiModelResolver>>(
    `${meta.id}/capability/ai-model-resolver`,
  );

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
    // TODO(dmaretskyi): Those should be provided at AI-chat call site.
    | ToolResolverService
    | ToolExecutionService
    | ComputeEventLogger
    | TracingService;

  export interface ComputeRuntimeProvider {
    getRuntime(spaceId: SpaceId): ManagedRuntime.ManagedRuntime<ComputeServices, never>;
  }

  /**
   * Runtime for executing agents, functions, and triggers.
   */
  export const ComputeRuntime = defineCapability<ComputeRuntimeProvider>(`${meta.id}/capability/compute-runtime`);
}
