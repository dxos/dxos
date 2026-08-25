//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/** The Anthropic Managed Agents API returned a non-2xx response. */
export class ClaudeAgentApiError extends BaseError.extend('ClaudeAgentApiError', 'Anthropic API request failed.') {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    options?: BaseErrorOptions,
  ) {
    super({ ...options, context: { ...(options?.context ?? {}), status, detail } });
  }
}

/** The agent has not been deployed yet, so there is no server-side agent to run. */
export class AgentNotDeployedError extends BaseError.extend(
  'AgentNotDeployedError',
  'Agent has not been deployed; run Deploy Claude Agent first.',
) {}

/** No environment is configured, so a session cannot be created. */
export class EnvironmentNotConfiguredError extends BaseError.extend(
  'EnvironmentNotConfiguredError',
  'No Anthropic environment id configured for this agent.',
) {}
