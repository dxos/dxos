import { AgentHandlers, AgentBlueprintHandlers, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { OperationHandlerSet } from '@dxos/operation';

export const SYSTEM_OPERATION_HANDLER_SET = OperationHandlerSet.merge(
  AgentHandlers,
  AgentBlueprintHandlers,
  DatabaseHandlers,
);
