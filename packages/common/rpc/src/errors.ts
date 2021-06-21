/**
 * Error that is reconstructed after being sent over the RPC boundary.
 */
//
// Copyright 2021 DXOS.org
//

export class SerializedRpcError extends Error {
  constructor (name: string, message: string, public readonly remoteStack: string, public readonly rpcMethod: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain. https://stackoverflow.com/a/48342359
    this.name = name;
    this.stack = remoteStack + `\n    ========[ RPC call: ${rpcMethod} ]========\n` + preprocessStack(this.stack!);
  }
}

function preprocessStack (stack: string) {
  const match = /^\s+at/gm.exec(stack);
  if (!match) {
    return stack;
  }
  return stack.slice(match.index);
}

/**
 * Thrown when request was terminated because the RPC endpoint has been closed.
 */
export class RpcClosedError extends Error {
  constructor () {
    super('Request was terminated because the RPC endpoint has been closed.');
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain. https://stackoverflow.com/a/48342359
  }
}

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends Error {
  constructor () {
    super('RPC has not been opened.');
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain. https://stackoverflow.com/a/48342359
  }
}
