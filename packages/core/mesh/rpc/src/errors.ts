//
// Copyright 2021 DXOS.org
//

import { Error as ErrorResponse } from '@dxos/protocols/proto/dxos/rpc';

/**
 * Error that is reconstructed after being sent over the RPC boundary.
 */
export class SerializedRpcError extends Error {
  // prettier-ignore
  constructor(
    name: string,
    message: string
  ) {
    super(message);
    this.name = name;
  }
}

const preprocessStack = (stack: string) => {
  const match = /^\s+at/gm.exec(stack);
  if (!match) {
    return stack;
  }

  return stack.slice(match.index);
};

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

export const encodeError = (err: any): ErrorResponse => {
  if (typeof err === 'object' && err?.message) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  } else if (typeof err === 'string') {
    return {
      message: err
    };
  } else {
    return {
      message: JSON.stringify(err)
    };
  }
};

export const decodeError = (err: ErrorResponse, rpcMethod: string): Error => {
  let error: Error;
  switch (err.name) {
    case 'RpcClosedError':
      error = new RpcClosedError();
      break;
    case 'RpcNotOpenError':
      error = new RpcNotOpenError();
      break;
    default:
      error = new SerializedRpcError(err.name ?? 'Error', err.message ?? 'Unknown Error');
  }
  error.stack = err.stack ?? '' + `\n    at RPC call: ${rpcMethod} \n` + preprocessStack(error.stack!);

  return error;
};
