//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type Error as SerializedErrorProto } from '../proto/gen/dxos/error.js';

import { BaseError } from '@dxos/errors';

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
