//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { synchronized, Trigger } from '@dxos/async';

import { RpcClosedError, RpcNotOpenError, SerializedRpcError } from './errors';
import { schema } from './proto/gen';
import { Request, Response, Error as ErrorResponse } from './proto/gen/dxos/rpc';

type MaybePromise<T> = Promise<T> | T

export interface RpcPeerOptions {
  messageHandler: (method: string, request: Uint8Array) => MaybePromise<Uint8Array>
  port: RpcPort
}

/**
 * Interface for a transport-agnostic port to send/receive binary messages.
 */
export interface RpcPort {
  send: (msg: Uint8Array) => MaybePromise<void>
  subscribe: (cb: (msg: Uint8Array) => void) => (() => void) | void
}

class RequestItem {
  constructor (
    public readonly resolve: (response: Response) => void,
    public readonly reject: (error: Error) => void
  ) {}
}

const codec = schema.getCodecForType('dxos.rpc.RpcMessage');

/**
 * A remote procedure call peer.
 *
 * Provides a away to make RPC calls and get a response back as a promise.
 * Does not handle encoding/decoding and only works with byte buffers.
 * For type safe approach see `createRpcClient` and `createRpcServer`.
 *
 * Must be connected with another instance on the other side via `send`/`receive` methods.
 * Both sides must be opened before making any RPC calls.
 *
 * Errors inside the handler get serialized and sent to the other side.
 */
export class RpcPeer {
  private readonly _requests = new Map<number, RequestItem>();

  private readonly _remoteOpenTrigger = new Trigger();

  private _nextId = 0;
  private _open = false;
  private _unsubscribe: (() => void) | undefined;

  constructor (private readonly _options: RpcPeerOptions) {}

  /**
   * Open the peer. Required before making any calls.
   *
   * Will block before the other peer calls `open`.
   */
  @synchronized
  async open () {
    if (this._open) {
      return;
    }

    this._unsubscribe = this._options.port.subscribe(this._receive.bind(this)) as any;

    await this._options.port.send(codec.encode({ open: true }));
    await this._remoteOpenTrigger.wait();

    // Send an "open" message in case the other peer has missed our first "open" message and is still waiting.
    await this._options.port.send(codec.encode({ open: true }));

    this._open = true;
  }

  /**
   * Close the peer. Stop taking or making requests.
   */
  close () {
    this._unsubscribe?.();
    for (const req of this._requests.values()) {
      req.reject(new RpcClosedError());
    }
    this._requests.clear();
    this._open = false;
  }

  /**
   * Handle incoming message. Shoulda be called as the result of other peer's `send` callback.
   */
  private async _receive (msg: Uint8Array): Promise<void> {
    const decoded = codec.decode(msg);
    if (decoded.request) {
      if (!this._open) {
        await this._options.port.send(codec.encode({ response: { error: encodeError(new RpcClosedError()) } }));
        return;
      }

      const req = decoded.request;
      const response = await this._callHandler(req);

      await this._options.port.send(codec.encode({ response }));
    } else if (decoded.response) {
      if (!this._open) {
        return; // Ignore when not open.
      }

      assert(typeof decoded.response.id === 'number');
      if (!this._requests.has(decoded.response.id)) {
        return; // Ignore requests with incorrect id.
      }

      const item = this._requests.get(decoded.response.id)!;
      this._requests.delete(decoded.response.id);

      item.resolve(decoded.response);
    } else if (decoded.open) {
      this._remoteOpenTrigger.wake();
    } else {
      throw new Error('Malformed message.');
    }
  }

  /**
   * Make RPC call. Will trigger a handler on the other side.
   *
   * Peer should be open before making this call.
   */
  async call (method: string, request: Uint8Array): Promise<Uint8Array> {
    if (!this._open) {
      throw new RpcNotOpenError();
    }

    const id = this._nextId++;

    const promise = new Promise<Response>((resolve, reject) => {
      this._requests.set(id, new RequestItem(resolve, reject));
    });

    // If a promise is rejected before it's awaited or an error handler is attached, node will print a warning.
    // Here we're attaching a dummy handler that will not interfere with error handling to avoid that warning.
    promise.catch(() => {});

    await this._options.port.send(codec.encode({
      request: {
        id,
        method,
        payload: request
      }
    }));

    const response = await promise;
    assert(response.id === id);

    if (response.payload) {
      return response.payload;
    } else if (response.error) {
      assert(response.error.name);
      assert(response.error.message);
      assert(response.error.stack);
      throw new SerializedRpcError(response.error.name, response.error.message, response.error.stack, method);
    } else {
      throw new Error('Malformed response.');
    }
  }

  private async _callHandler (req: Request): Promise<Response> {
    try {
      assert(typeof req.id === 'number');
      assert(req.payload);
      assert(req.method);
      const response = await this._options.messageHandler(req.method, req.payload);
      return {
        id: req.id,
        payload: response
      };
    } catch (err) {
      return {
        id: req.id,
        error: encodeError(err)
      };
    }
  }
}

function encodeError (err: any): ErrorResponse {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack
  };
}
