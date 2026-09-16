//
// Copyright 2023 DXOS.org
//

import { BaseError, messageOf } from '@dxos/errors';
import { invariant } from '@dxos/invariant';

import { type Error as SerializedErrorProto } from '../buf/proto/gen/dxos/error_pb.ts';
import { SystemError } from './base-errors.ts';

export const reconstructError = (error: SerializedErrorProto) => {
  const { name, message, context } = error;
  return errorFromCode(name, message, context);
};

const errorRegistry = new Map<string, (message?: string, context?: any) => Error>();

export const registerError = (code: string, make: (message?: string, context?: any) => Error) => {
  invariant(!errorRegistry.has(code), `Error code already registered: ${code}`);
  errorRegistry.set(code, make);
};

export const registerErrorNoArgs = (code: string, Constructor: { new (options?: any): Error }) => {
  registerError(code, () => new Constructor());
};

export const registerErrorMessageContext = (
  code: string,
  Constructor: { new (options?: { message?: string; context?: any }): Error },
) => {
  registerError(code, (message?: string, context?: any) => new Constructor({ message, context }));
};

export const errorFromCode = (code?: string, message?: string, context?: any) => {
  if (code && errorRegistry.has(code)) {
    return errorRegistry.get(code)!(message, context);
  } else {
    return new BaseError(code ?? 'Error', { message, context });
  }
};

/**
 * Narrows a thrown value for a service RPC's error channel.
 *
 * A DXOS error is returned as it is, so `encodeError`/`decodeError` reconstruct its class on
 * the far side; anything else becomes a `SystemError` carrying the original as `cause`, which
 * is the one case the old `error as Error` cast got wrong — a thrown string crossed the wire
 * claiming to be an `Error`. Services that grow a more specific error can return it directly.
 */
export const toServiceError = (error: unknown): BaseError =>
  error instanceof BaseError ? error : new SystemError({ message: messageOf(error), cause: error });
