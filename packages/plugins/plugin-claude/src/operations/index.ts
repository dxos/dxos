//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ClaudeAgentOperation } from '#types';

export const ClaudeAgentOperationHandlerSet = OperationHandlerSet.lazy([
  ClaudeAgentOperation.CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent.ts'))),
  ClaudeAgentOperation.ListAgents.pipe(Operation.lazyHandler(() => import('./list-agents.ts'))),
  ClaudeAgentOperation.DeployAgent.pipe(Operation.lazyHandler(() => import('./deploy-agent.ts'))),
  ClaudeAgentOperation.StartSession.pipe(Operation.lazyHandler(() => import('./start-session.ts'))),
  ClaudeAgentOperation.SendMessage.pipe(Operation.lazyHandler(() => import('./send-message.ts'))),
  ClaudeAgentOperation.UpdateSessionCredentials.pipe(
    Operation.lazyHandler(() => import('./update-session-credentials.ts')),
  ),
  ClaudeAgentOperation.GetTranscript.pipe(Operation.lazyHandler(() => import('./get-transcript.ts'))),
]);
