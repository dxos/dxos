//
// Copyright 2023 DXOS.org
//

import { Error as SerializedErrorProto } from './proto/gen/dxos/error';

export const encodeError = (err: any): SerializedErrorProto => {
  if (typeof err === 'object' && err?.message) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  } else if (typeof err === 'string') {
    return {
      message: err,
    };
  } else {
    return {
      message: JSON.stringify(err),
    };
  }
};

export type DecodeOptions = {
  appendStack?: string;
};

export const decodeError = (err: SerializedErrorProto, { appendStack }: DecodeOptions = {}): Error => {
  let error: Error;
  switch (err.name) {
    case 'RpcClosedError':
      error = new RpcClosedError();
      break;
    case 'RpcNotOpenError':
      error = new RpcNotOpenError();
      break;
    default:
      error = new SerializedError(err.name ?? 'Error', err.message ?? 'Unknown Error');
  }
  if (appendStack) {
    error.stack = (err.stack ?? `${error.message}\n`) + appendStack;
  } else {
    error.stack = err.stack;
  }

  return error;
};

/**
 * Error that is reconstructed after being sent over the RPC boundary.
 */
export class SerializedError extends Error {
  // prettier-ignore
  constructor(
    name: string,
    message: string
  ) {
    super(message);
    this.name = name;
  }
}

/**
 * Thrown when request was terminated because the RPC endpoint has been closed.
 */
export class RpcClosedError extends Error {
  constructor() {
    super('Request was terminated because the RPC endpoint is closed.');
  }
}

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends Error {
  constructor() {
    super('RPC has not been opened.');
  }
}
