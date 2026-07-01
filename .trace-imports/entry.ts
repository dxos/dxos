//
// Copyright 2026 DXOS.org
//

import { AgentHandlers, AgentSkillHandlers, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { OperationHandlerSet } from '@dxos/operation';

export const SYSTEM_OPERATION_HANDLER_SET = OperationHandlerSet.merge(
  AgentHandlers,
  AgentSkillHandlers,
  DatabaseHandlers,
);
