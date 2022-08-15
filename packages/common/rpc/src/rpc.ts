//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { StackTrace } from '@dxos/debug';
import { exponentialBackoffInterval } from '@dxos/util';

import { RpcClosedError, RpcNotOpenError, SerializedRpcError } from './errors';
import { schema } from './proto/gen';
import { Request, Response, Error as ErrorResponse, RpcMessage } from './proto/gen/dxos/rpc';
import { Any } from './proto/gen/google/protobuf';

const DEFAULT_TIMEOUT = 3000;

const log = debug('dxos:rpc');
const error = log.extend('error');

type MaybePromise<T> = Promise<T> | T

export interface RpcPeerOptions {
  messageHandler: (method: string, request: Any) => MaybePromise<Any>
  streamHandler?: (method: string, request: Any) => Stream<Any>
  port: RpcPort
  timeout?: number
  /**
   * Do not require or send handshake messages.
   */
  noHandshake?: boolean
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
 *
 * Inspired by JSON-RPC 2.0 https://www.jsonrpc.org/specification.
 */
export class RpcPeer {
  private readonly _outgoingRequests = new Map<number, RequestItem>();

  private readonly _localStreams = new Map<number, Stream<any>>();

  private readonly _remoteOpenTrigger = new Trigger();

  private _nextId = 0;
  private _open = false;
  private _unsubscribe: (() => void) | undefined;
  private _clearOpenInterval: (() => void) | undefined;

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

    this._unsubscribe = this._options.port.subscribe(async msg => {
      try {
        await this._receive(msg);
      } catch (error) {
        log(error);
      }
    }) as any;

    this._open = true;

    if (this._options.noHandshake) {
      this._remoteOpenTrigger.wake();
      return;
    }

    log('Send open message');
    await this._sendMessage({ open: true });

    this._clearOpenInterval = exponentialBackoffInterval(() => {
      void this._sendMessage({ open: true }).catch(error => log(`Error: ${error}`));
    }, 50);

    await this._remoteOpenTrigger.wait();

    this._clearOpenInterval?.();

    // Send an "open" message in case the other peer has missed our first "open" message and is still waiting.
    log('Send second open message');
    await this._sendMessage({ openAck: true });
  }

  /**
   * Close the peer. Stop taking or making requests.
   */
  close () {
    this._unsubscribe?.();
    this._clearOpenInterval?.();
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
        log('Received request while not open.');
        await this._sendMessage({
          response: {
            id: decoded.request.id,
            error: encodeError(new RpcClosedError())
          }
        });
        return;
      }

      const req = decoded.request;
      if (req.stream) {
        log(`Request (stream): ${req.method}`);
        this._callStreamHandler(req, response => {
          log(`Send response (stream): ${req.method} response=${response.payload?.type_url} error=${JSON.stringify(response.error)} close=${response.close}`);
          void this._sendMessage({ response }).catch(error => {
            log(`Unhandled error during stream close: ${error}`);
          });
        });
      } else {
        log(`Request: ${req.method}`);
        const response = await this._callHandler(req);

        log(`Send response (stream): ${req.method} response=${response.payload?.type_url} error=${JSON.stringify(response.error)}`);
        await this._sendMessage({ response });
      }
    } else if (decoded.response) {
      if (!this._open) {
        log('Received response while not open.');
        return; // Ignore when not open.
      }

      const responseId = decoded.response.id;

      assert(typeof responseId === 'number');
      if (!this._outgoingRequests.has(responseId)) {
        log(`Received response with incorrect id: ${responseId}`);
        return; // Ignore requests with incorrect id.
      }

      const item = this._outgoingRequests.get(responseId)!;
      // Delete the request record if no more responses are expected.
      if (!item.stream) {
        this._outgoingRequests.delete(responseId);
      }

      log(`Response: ${decoded.response.payload?.type_url}`);
      item.resolve(decoded.response);
    } else if (decoded.open) {
      log('Received open message');
      if (this._options.noHandshake) {
        return;
      }

      await this._sendMessage({ openAck: true });
    } else if (decoded.openAck) {
      log('Received openAck message');
      if (this._options.noHandshake) {
        return;
      }

      this._remoteOpenTrigger.wake();
    } else if (decoded.streamClose) {
      if (!this._open) {
        log('Received stream close while not open');
        return; // Ignore when not open.
      }
      log(`Received stream close: id=${decoded.streamClose.id}`);

      assert(typeof decoded.streamClose.id === 'number');

      const stream = this._localStreams.get(decoded.streamClose.id);
      if (!stream) {
        log(`No local stream for id=${decoded.streamClose.id}`);
        return; // Ignore requests with incorrect id.
      }

      this._localStreams.delete(decoded.streamClose.id);
      stream.close();
    } else {
      error(`Received malformed message: ${msg}`);
      throw new Error('Malformed message.');
    }
  }

  /**
   * Make RPC call. Will trigger a handler on the other side.
   *
   * Peer should be open before making this call.
   */
  async call (method: string, request: Any): Promise<Any> {
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

    void this._sendMessage({
      request: {
        id,
        method,
        payload: request,
        stream: false
      }
    });

    let response: Response;
    try {
      response = await Promise.race([promise, createTimeoutPromise(this._options.timeout ?? DEFAULT_TIMEOUT, new Error(`RPC call timed out: ${method}`))]);
    } catch (err) {
      if (err instanceof RpcClosedError) {
        // Rethrow the error here to have the correct stack-trace.
        const error = new RpcClosedError();
        error.stack += `\n\nRpc client was closed at:\n${err.stack}`;
        throw error;
      }
      throw err;
    }
    assert(response.id === id);

    if (response.payload) {
      return response.payload;
    } else if (response.error) {
      throw new SerializedRpcError(response.error.name ?? 'UnknownError', response.error.message ?? 'Unknown Error', response.error.stack ?? '', method);
    } else {
      throw new Error('Malformed response.');
    }
  }

  /**
   * Make RPC call with a streaming response. Will trigger a handler on the other side.
   *
   * Peer should be open before making this call.
   */
  callStream (method: string, request: Any): Stream<Any> {
    if (!this._open) {
      throw new RpcNotOpenError();
    }

    const id = this._nextId++;

    return new Stream(({ ready, next, close }) => {
      const onResponse = (response: Response) => {
        if (response.streamReady) {
          ready();
        } else if (response.close) {
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

      const stack = new StackTrace();

      const closeStream = (error?: Error) => {
        if (!error) {
          close();
        } else {
          error.stack += `\n\nError happened in the stream at:\n${stack.getStack()}`;
          close(error);
        }
      };

      this._outgoingRequests.set(id, new RequestItem(onResponse, closeStream, true));

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
    await this._options.port.send(codec.encode(message));
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
    } catch (err: any) {
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
      responseStream.onReady(() => {
        callback({
          id: req.id,
          streamReady: true
        });
      });
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
    } catch (err: any) {
      callback({
        id: req.id,
        error: encodeError(err)
      });
    }
  }
}

const encodeError = (err: any): ErrorResponse => {
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

/**
 * Creates a promise that will be rejected after a certain timeout.
 * The promise will never cause unhandledPromiseRejection.
 * The timeout will not block the Node.JS process from exiting.
 */
const createTimeoutPromise = (timeout: number, error: Error) => {
  const timeoutPromise = new Promise<any>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(error),
      timeout
    );

    // `unref` prevents the timeout from blocking Node.JS process from exiting. Not available in browsers.
    if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
      timeoutId.unref();
    }
  });
  timeoutPromise.catch(() => {}); // Mute the promise.
  return timeoutPromise;
};
