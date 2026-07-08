//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * The acting principal lacks the capability required for the operation
 * (e.g. delegating access above their own level, or revoking without causal seniority).
 */
export class NotAuthorizedError extends BaseError.extend('NotAuthorizedError', 'Not authorized') {}

/**
 * The referenced principal (individual or group) is not known to the service.
 */
export class UnknownPrincipalError extends BaseError.extend('UnknownPrincipalError', 'Unknown principal') {}

/**
 * A signed payload failed signature verification or its id does not match its key.
 */
export class InvalidSignatureError extends BaseError.extend('InvalidSignatureError', 'Invalid signature') {}

/**
 * A membership operation references causal predecessors that have not been received.
 */
export class MissingDependencyError extends BaseError.extend('MissingDependencyError', 'Missing dependency') {}
