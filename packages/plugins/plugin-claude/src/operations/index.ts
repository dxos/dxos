//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ClaudeAgentOperation, CloudRunOperation } from '#types';

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

/** The cloud coding run, started and folded by an operation; it runs where EDGE serves coding-agent control. */
export const CloudRunOperationHandlerSet = OperationHandlerSet.lazy([
  CloudRunOperation.StartCloudRun.pipe(
    Operation.lazyHandler(() => import('./cloud-run.ts').then(({ start }) => ({ default: start }))),
  ),
  CloudRunOperation.SyncCloudRun.pipe(
    Operation.lazyHandler(() => import('./cloud-run.ts').then(({ syncRun }) => ({ default: syncRun }))),
  ),
  CloudRunOperation.DriveCloudRuns.pipe(
    Operation.lazyHandler(() => import('./drive-cloud-runs.ts').then(({ drive }) => ({ default: drive }))),
  ),
]);
