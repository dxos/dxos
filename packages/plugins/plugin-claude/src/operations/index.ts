//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ClaudeAgentOperation } from '#types';

export const ClaudeAgentOperationHandlerSet = OperationHandlerSet.lazy([
  ClaudeAgentOperation.CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent'))),
  ClaudeAgentOperation.ListAgents.pipe(Operation.lazyHandler(() => import('./list-agents'))),
  ClaudeAgentOperation.DeployAgent.pipe(Operation.lazyHandler(() => import('./deploy-agent'))),
  ClaudeAgentOperation.StartSession.pipe(Operation.lazyHandler(() => import('./start-session'))),
  ClaudeAgentOperation.SendMessage.pipe(Operation.lazyHandler(() => import('./send-message'))),
  ClaudeAgentOperation.SetSessionCredentials.pipe(Operation.lazyHandler(() => import('./set-session-credentials'))),
  ClaudeAgentOperation.RevokeSessionCredentials.pipe(
    Operation.lazyHandler(() => import('./revoke-session-credentials')),
  ),
  ClaudeAgentOperation.GetTranscript.pipe(Operation.lazyHandler(() => import('./get-transcript'))),
]);
