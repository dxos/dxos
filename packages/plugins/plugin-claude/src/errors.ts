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

/**
 * The session predates per-session vaults (or was created elsewhere), so there is nowhere to bind a
 * credential: `vault_ids` is fixed at session creation and cannot be added to a live session.
 */
export class SessionVaultMissingError extends BaseError.extend(
  'SessionVaultMissingError',
  'Session has no credential vault; start a new session to attach credentials.',
) {}

/** The named credential is not bound to the session, so there is nothing to rotate or revoke. */
export class CredentialNotBoundError extends BaseError.extend(
  'CredentialNotBoundError',
  'No credential with that name is bound to the session.',
) {}

/**
 * The request asked for nothing. Rejected rather than treated as a no-op: the inputs are optional
 * plain arrays (see `ClaudeAgentOperation`), so emptiness is checked in the handler.
 */
export class NoCredentialChangeError extends BaseError.extend(
  'NoCredentialChangeError',
  'No credential change was requested; pass credentials, revoke or refresh.',
) {}

/** A referenced AccessToken is gone, or its server-custodied value could not be exchanged. */
export class CredentialResolutionError extends BaseError.extend(
  'CredentialResolutionError',
  'Referenced credential could not be resolved.',
) {}

/**
 * A name was given to both `credentials` and `revoke` in one call. Rejected before any vault write:
 * writing then archiving the same name leaves the session reporting it bound with nothing behind it.
 */
export class CredentialConflictError extends BaseError.extend(
  'CredentialConflictError',
  'A credential cannot be bound and revoked in the same call.',
) {}
