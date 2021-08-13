//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { sleep, synchronized, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';

import { RpcClosedError, RpcNotOpenError, SerializedRpcError } from './errors';
import { schema } from './proto/gen';
import { Request, Response, Error as ErrorResponse, RpcMessage } from './proto/gen/dxos/rpc';

const DEFAULT_TIMEOUT = 3000;

const log = debug('dxos:rpc');

type MaybePromise<T> = Promise<T> | T

export interface RpcPeerOptions {
  messageHandler: (method: string, request: Uint8Array) => MaybePromise<Uint8Array>
  streamHandler?: (method: string, request: Uint8Array) => Stream<Uint8Array>
  port: RpcPort,
  timeout?: number,
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
    public readonly reject: (error?: Error) => void,
    public readonly stream: boolean
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
  private readonly _outgoingRequests = new Map<number, RequestItem>();

  private readonly _localStreams = new Map<number, Stream<any>>();

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

    await this._sendMessage({ open: true });
    await this._remoteOpenTrigger.wait();

    // Send an "open" message in case the other peer has missed our first "open" message and is still waiting.
    await this._sendMessage({ open: true });

    this._open = true;
  }

  /**
   * Close the peer. Stop taking or making requests.
   */
  close () {
    this._unsubscribe?.();
    for (const req of this._outgoingRequests.values()) {
      req.reject(new RpcClosedError());
    }
    this._outgoingRequests.clear();
    this._open = false;
  }

  /**
   * Handle incoming message. Should be called as the result of other peer's `send` callback.
   */
  private async _receive (msg: Uint8Array): Promise<void> {
    const decoded = codec.decode(msg);
    if (decoded.request) {
      if (!this._open) {
        await this._sendMessage({ response: { error: encodeError(new RpcClosedError()) } });
        return;
      }

      const req = decoded.request;
      if (req.stream) {
        this._callStreamHandler(req, response => {
          this._sendMessage({ response });
        });
      } else {
        const response = await this._callHandler(req);

        await this._sendMessage({ response });
      }
    } else if (decoded.response) {
      if (!this._open) {
        return; // Ignore when not open.
      }

      assert(typeof decoded.response.id === 'number');
      if (!this._outgoingRequests.has(decoded.response.id)) {
        return; // Ignore requests with incorrect id.
      }

      const item = this._outgoingRequests.get(decoded.response.id)!;
      // Delete the request record if no more responses are expected.
      if (!item.stream) {
        this._outgoingRequests.delete(decoded.response.id);
      }

      item.resolve(decoded.response);
    } else if (decoded.open) {
      this._remoteOpenTrigger.wake();
    } else if (decoded.streamClose) {
      if (!this._open) {
        return; // Ignore when not open.
      }

      assert(typeof decoded.streamClose.id === 'number');

      const stream = this._localStreams.get(decoded.streamClose.id);
      if (!stream) {
        log(`No local stream for id=${decoded.streamClose.id}`);
        return; // Ignore requests with incorrect id.
      }

      this._localStreams.delete(decoded.streamClose.id);
      stream.close();
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
      this._outgoingRequests.set(id, new RequestItem(resolve, reject, false));
    });

    // If a promise is rejected before it's awaited or an error handler is attached, node will print a warning.
    // Here we're attaching a dummy handler that will not interfere with error handling to avoid that warning.
    promise.catch(() => {});

    await this._sendMessage({
      request: {
        id,
        method,
        payload: request
      }
    });

    const timeoutPromise = sleep(this._options.timeout ?? DEFAULT_TIMEOUT).then(() => Promise.reject(new Error('Timeout')));
    timeoutPromise.catch(() => {}); // Mute the promise.

    const response = await Promise.race([promise, timeoutPromise]);
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

  /**
   * Make RPC call with a streaming response. Will trigger a handler on the other side.
   *
   * Peer should be open before making this call.
   */
  callStream (method: string, request: Uint8Array): Stream<Uint8Array> {
    if (!this._open) {
      throw new RpcNotOpenError();
    }

    const id = this._nextId++;

    return new Stream(({ next, close }) => {
      const onResponse = (response: Response) => {
        if (response.close) {
          close();
        } else if (response.error) {
          assert(response.error.name);
          assert(response.error.message);
          assert(response.error.stack);
          // TODO(marik-d): Stack trace might be lost because the stream producer function is called asynchronously.
          close(new SerializedRpcError(response.error.name, response.error.message, response.error.stack, method));
        } else if (response.payload) {
          next(response.payload);
        } else {
          throw new Error('Malformed response.');
        }
      };

      this._outgoingRequests.set(id, new RequestItem(onResponse, close, true));

      this._sendMessage({
        request: {
          id,
          method,
          payload: request,
          stream: true
        }
      }).catch(error => close(error));

      return () => {
        this._sendMessage({
          streamClose: { id }
        }).catch(() => {}); // Ignore the error here as there's no good way to handle it.
      };
    });
  }

  private async _sendMessage (message: RpcMessage) {
    this._options.port.send(codec.encode(message));
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

  private _callStreamHandler (req: Request, callback: (response: Response) => void) {
    try {
      assert(this._options.streamHandler, 'Requests with streaming responses are not supported.');
      assert(typeof req.id === 'number');
      assert(req.payload);
      assert(req.method);
      const responseStream = this._options.streamHandler(req.method, req.payload);
      responseStream.subscribe(
        msg => {
          callback({
            id: req.id,
            payload: msg
          });
        },
        error => {
          if (error) {
            callback({
              id: req.id,
              error: encodeError(error)
            });
          } else {
            callback({
              id: req.id,
              close: true
            });
          }
        }
      );
      this._localStreams.set(req.id, responseStream);
    } catch (err) {
      callback({
        id: req.id,
        error: encodeError(err)
      });
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
