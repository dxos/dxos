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
  send: (msg: Uint8Array) => MaybePromise<void>
}

class RequestItem {
  constructor (
    public readonly resolve: (response: Response) => void,
    public readonly reject: (error: Error) => void
  ) {}
}

const codec = schema.getCodecForType('dxos.rpc.RpcMessage');

export class RpcPeer {
  private readonly _requests = new Map<number, RequestItem>();

  private readonly _remoteOpenTrigger = new Trigger();

  private _nextId = 0;
  private _open = false;
  private _remoteOpen = false;

  constructor (private readonly _options: RpcPeerOptions) {}

  @synchronized
  async open () {
    if (this._open) {
      return;
    }

    await this._options.send(codec.encode({ open: true }));
    await this._remoteOpenTrigger.wait();

    this._open = true;
  }

  close () {
    for (const req of this._requests.values()) {
      req.reject(new RpcClosedError());
    }
    this._requests.clear();
    this._open = false;
  }

  async receive (msg: Uint8Array): Promise<void> {
    const decoded = codec.decode(msg);
    if (decoded.request) {
      if (!this._open) {
        await this._options.send(codec.encode({ response: { error: encodeError(new RpcClosedError()) } }));
        return;
      }

      const req = decoded.request;
      const response = await this._callHandler(req);

      await this._options.send(codec.encode({ response }));
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

      // Respond with an "open" message to acknowledge opening.
      if (!this._remoteOpen) {
        this._remoteOpen = true;
        await this._options.send(codec.encode({ open: true }));
      }
    } else {
      throw new Error('Malformed message.');
    }
  }

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

    await this._options.send(codec.encode({
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
