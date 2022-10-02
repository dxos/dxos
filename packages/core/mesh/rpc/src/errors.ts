//
// Copyright 2021 DXOS.org
//

/**
 * Error that is reconstructed after being sent over the RPC boundary.
 */
export class SerializedRpcError extends Error {
  constructor (name: string, message: string, public readonly remoteStack: string, public readonly rpcMethod: string) {
    super(message);
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.stack = remoteStack + `\n at RPC call: ${rpcMethod} \n` + preprocessStack(this.stack!);
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
  constructor () {
    super('Request was terminated because the RPC endpoint is closed.');
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends Error {
  constructor () {
    super('RPC has not been opened.');
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
