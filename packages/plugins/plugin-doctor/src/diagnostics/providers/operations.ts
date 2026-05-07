//
// Copyright 2026 DXOS.org
//

import { Operation } from '@dxos/compute';
import { Filter } from '@dxos/echo';

import { meta } from '#meta';

import { getReadySpaces } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Whitelist of services known to the runtime. Keys are `Context.Tag` identifiers.
 * Operations that declare other services are flagged.
 */
export const KNOWN_SERVICES: ReadonlySet<string> = new Set([
  '@dxos/ai/AiContextService',
  '@dxos/ai/AiModelResolver',
  '@dxos/ai/AiService',
  '@dxos/ai/ChatCompletionsClient',
  '@dxos/ai/OpaqueToolkit.OpaqueToolkitProvider',
  '@dxos/ai/ToolExecutionService',
  '@dxos/ai/ToolFormatter',
  '@dxos/ai/ToolResolverService',
  '@dxos/app-framework/CapabilityManager',
  '@dxos/assistant/AiContextService',
  '@dxos/assistant/AiSessionService',
  '@dxos/assistant/ArtifactDiffResolver',
  '@dxos/assistant/FunctionToolAnnotation',
  '@dxos/assistant/GraphWriterSchema',
  '@dxos/blueprints/RegistryService',
  '@dxos/conductor/ComputeNodeContext',
  '@dxos/echo/Database/Service',
  '@dxos/echo/Feed/FeedService',
  '@dxos/functions-runtime/AgentService',
  '@dxos/functions-runtime/FeedTraceSink',
  '@dxos/functions-runtime/ProcessManagerService',
  '@dxos/functions/ContextQueueService',
  '@dxos/functions/CredentialsService',
  '@dxos/functions/FunctionImplementationResolver',
  '@dxos/functions/FunctionInvocationService',
  '@dxos/functions/LocalFunctionExecutionService',
  '@dxos/functions/ProcessMonitorService',
  '@dxos/functions/ProcessOperationInvoker',
  '@dxos/functions/QueueService',
  '@dxos/functions/RemoteFunctionExecutionService',
  '@dxos/functions/ServiceRegistry',
  '@dxos/functions/ServiceResolver',
  '@dxos/functions/StorageService',
  '@dxos/functions/TraceService',
  '@dxos/functions/TraceSink',
  '@dxos/functions/TriggerDispatcher',
  '@dxos/functions/TriggerStateStore',
  '@dxos/operation/OperationHandlerProvider',
  '@dxos/operation/OperationRegistry',
  '@dxos/operation/Service',
]);

/**
 * Scan saved operations and flag any that request a service not present in the whitelist.
 */
export const operationsServicesDiagnostic: DiagnosticProvider = {
  id: 'operations-services',
  label: `${meta.id}.diagnostic.operations-services.label`,
  description: `${meta.id}.diagnostic.operations-services.description`,
  run: async ({ client, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const spaces = getReadySpaces(client);
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const operations = await space.db.query(Filter.type(Operation.PersistentOperation)).run();
      for (const operation of operations) {
        const services = operation.services ?? [];
        const unknown = services.filter((service: string) => !KNOWN_SERVICES.has(service));
        if (unknown.length > 0) {
          issues.push({
            id: `${space.id}:${operation.id}:unknown-services`,
            severity: 'error',
            message: `Operation "${operation.name || operation.key}" requests unknown service(s): ${unknown.join(', ')}.`,
            subjectLabel: operation.key,
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
