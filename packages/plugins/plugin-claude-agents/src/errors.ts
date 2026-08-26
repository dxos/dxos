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

/** The session object carries no Anthropic session key, so there is nothing to address. */
export class SessionNotLinkedError extends BaseError.extend(
  'SessionNotLinkedError',
  'Session is not linked to an Anthropic session id.',
) {}

/** No Anthropic credential is stored in the space, so the API cannot be called. */
export class MissingCredentialError extends BaseError.extend(
  'MissingCredentialError',
  'No Anthropic API credential is connected in this space.',
) {}
