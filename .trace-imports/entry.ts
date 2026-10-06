//
// Copyright 2026 DXOS.org
//

import { DatabaseHandlers } from '@dxos/assistant-toolkit';
import * as AgentOperationHandlerSet from '@dxos/assistant-toolkit/AgentOperationHandlerSet';
import * as AgentSkill from '@dxos/assistant-toolkit/AgentSkill';
import { OperationHandlerSet } from '@dxos/operation';

export const SYSTEM_OPERATION_HANDLER_SET = OperationHandlerSet.merge(
  AgentOperationHandlerSet.handlers,
  AgentSkill.Handlers,
  DatabaseHandlers,
);
