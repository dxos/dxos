//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailableError') {}

export class ProcessNotFoundError extends BaseError.extend('ProcessNotFoundError') {}

export class LayerDependencyCycleError extends BaseError.extend('LayerDependencyCycleError') {}

export class FunctionServiceError extends BaseError.extend('FunctionServiceError') {}

/**
 * A remote host refused a process command and would refuse it again (an unknown process key, a
 * malformed request, a caller without access), as opposed to being unreachable. A
 * `RemoteProcessManager.Control` dies with it so a retrying caller can tell the two apart.
 */
export class RemoteCommandRejectedError extends BaseError.extend(
  'RemoteCommandRejectedError',
  'The remote host rejected the command.',
) {}

/** A remote host did not accept a process within the time its caller was prepared to wait. */
export class RemoteRuntimeUnreachableError extends BaseError.extend(
  'RemoteRuntimeUnreachableError',
  'The remote runtime did not accept the process in time.',
) {}
