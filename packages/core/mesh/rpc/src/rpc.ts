//
// Copyright 2021 DXOS.org
//

import { type MessageInitShape } from '@bufbuild/protobuf';

import { Trigger, asyncTimeout, synchronized } from '@dxos/async';
// NOTE: `Stream` is imported from the dedicated `./stream` subpath rather than the package
// root so the Worker bundle does not pull in `@dxos/codec-protobuf`'s `Schema`/`protobufjs`
// reflection module just to reach the stream class.
import { type RequestOptions } from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Context, ContextRpcCodec } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { RpcClosedError, RpcNotOpenError, encodeError } from '@dxos/protocols';
import { exponentialBackoffInterval } from '@dxos/util';

import { decodeRpcError } from './errors';
// NOTE: `@dxos/protocols/proto` is intentionally NOT imported here — its `schema`
// runtime path uses `protobufjs` reflection (and `@protobufjs/codegen`), which is
// forbidden in Cloudflare Workers / `workerd` (string-based code generation is
// disallowed). The static, bufbuild-backed codec below is Worker-safe.
import {
  type Any,
  type Request,
  type Response,
  type RpcMessageInit,
  ResponseSchema,
  RpcMessageCodec,
} from './rpc-message-codec';

export type { Any } from './rpc-message-codec';

const DEFAULT_TIMEOUT = 30_000;
const BYE_SEND_TIMEOUT = 2_000;

const DEBUG_CALLS = true;

type MaybePromise<T> = Promise<T> | T;

type ResponseInit = MessageInitShape<typeof ResponseSchema>;

export interface RpcPeerOptions {
  port: RpcPort;

  /**
   * Time to wait for a response to an RPC call.
   */
  timeout?: number;

  callHandler: (method: string, request: Any, options?: RequestOptions) => MaybePromise<Any>;
  streamHandler?: (method: string, request: Any, options?: RequestOptions) => Stream<Any>;

  /**
   * Do not require or send handshake messages.
   */
  noHandshake?: boolean;

  /**
   * What options get passed to the `callHandler` and `streamHandler`.
   */
  handlerRpcOptions?: RequestOptions;
}

/**
 * Interface for a transport-agnostic port to send/receive binary messages.
 */
export interface RpcPort {
  send: (msg: Uint8Array, timeout?: number) => MaybePromise<void>;
  subscribe: (cb: (msg: Uint8Array) => void) => (() => void) | void;
}

const CLOSE_TIMEOUT = 3_000;

export type CloseOptions = {
  /**
   * Time to wait for the other side to confirm close.
   */
  timeout?: number;
};

class PendingRpcRequest {
  constructor(
    public readonly resolve: (response: Response) => void,
    public readonly reject: (error?: Error) => void,
    public readonly stream: boolean,
  ) {}
}

enum RpcState {
  INITIAL = 'INITIAL',

  OPENING = 'OPENING',

  OPENED = 'OPENED',

  /**
   * Bye message sent, waiting for the other side to close.
   * Not possible to send requests.
   * All pending requests will be rejected.
   */
  CLOSING = 'CLOSING',

  /**
   * Connection fully closed.
   * The underlying transport can be disposed.
   */
  CLOSED = 'CLOSED',
}

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
  private readonly _params: RpcPeerOptions;

  private readonly _outgoingRequests = new Map<number, PendingRpcRequest>();
  private readonly _localStreams = new Map<number, Stream<Any>>();
  private readonly _remoteOpenTrigger = new Trigger();

  /**
   * Triggered when the peer starts closing.
   */
  private readonly _closingTrigger = new Trigger();

  /**
   * Triggered when peer receives a bye message.
   */
  private readonly _byeTrigger = new Trigger();

  private _nextId = 0;
  private _state: RpcState = RpcState.INITIAL;
  private _unsubscribeFromPort: (() => void) | undefined = undefined;
  private _clearOpenInterval: (() => void) | undefined = undefined;

  constructor(params: RpcPeerOptions) {
    this._params = {
      timeout: undefined,
      streamHandler: undefined,
      noHandshake: false,
      ...params,
    };
  }

  /**
   * Open the peer. Required before making any calls.
   *
   * Will block before the other peer calls `open`.
   */
  @synchronized
  async open(): Promise<void> {
    if (this._state !== RpcState.INITIAL) {
      return;
    }

    this._unsubscribeFromPort = this._params.port.subscribe(async (msg) => {
      try {
        await this._receive(msg);
      } catch (err: any) {
        log.catch(err);
      }
    }) as any;

    this._state = RpcState.OPENING;

    if (this._params.noHandshake) {
      this._state = RpcState.OPENED;
      this._remoteOpenTrigger.wake();
      return;
    }

    log('sending open message', { state: this._state });
    await this._sendMessage({ content: { case: 'open', value: true } });

    if (this._state !== RpcState.OPENING) {
      return;
    }

    // Retry sending.
    this._clearOpenInterval = exponentialBackoffInterval(() => {
      void this._sendMessage({ content: { case: 'open', value: true } }).catch((err) => log.warn(err));
    }, 50);

    await Promise.race([this._remoteOpenTrigger.wait(), this._closingTrigger.wait()]);

    this._clearOpenInterval?.();

    if ((this._state as RpcState) !== RpcState.OPENED) {
      // Closed while opening.
      return; // TODO(burdon): Throw error?
    }

    // TODO(burdon): This seems error prone.
    // Send an "open" message in case the other peer has missed our first "open" message and is still waiting.
    log('resending open message', { state: this._state });
    await this._sendMessage({ content: { case: 'openAck', value: true } });
  }

  /**
   * Close the peer.
   * Stop taking or making requests.
   * Will wait for confirmation from the other side.
   * Any responses for RPC calls made before close will be delivered.
   */
  async close({ timeout = CLOSE_TIMEOUT }: CloseOptions = {}): Promise<void> {
    if (this._state === RpcState.CLOSED) {
      return;
    }

    this._abortRequests();

    if (this._state === RpcState.OPENED && !this._params.noHandshake) {
      try {
        this._state = RpcState.CLOSING;
        await this._sendMessage({ content: { case: 'bye', value: {} } }, BYE_SEND_TIMEOUT);
      } catch (err: any) {
        log('error closing peer, sending bye', { err });
      }
      try {
        log('closing waiting on bye');
        await this._byeTrigger.wait({ timeout });
      } catch (err: any) {
        log('error closing peer', { err });
        return;
      }
    }

    this._disposeAndClose();
  }

  /**
   * Dispose the connection without waiting for the other side.
   */
  async abort(): Promise<void> {
    if (this._state === RpcState.CLOSED) {
      return;
    }

    this._abortRequests();
    this._disposeAndClose();
  }

  private _abortRequests(): void {
    // Abort open
    this._clearOpenInterval?.();
    this._closingTrigger.wake();

    // Abort pending requests
    for (const req of this._outgoingRequests.values()) {
      req.reject(new RpcClosedError());
    }
    this._outgoingRequests.clear();
  }

  private _disposeAndClose(): void {
    this._unsubscribeFromPort?.();
    this._unsubscribeFromPort = undefined;
    this._clearOpenInterval?.();
    this._state = RpcState.CLOSED;
  }

  /**
   * Handle incoming message. Should be called as the result of other peer's `send` callback.
   */
  private async _receive(msg: Uint8Array): Promise<void> {
    const decoded = RpcMessageCodec.decode(msg);
    DEBUG_CALLS && log.trace('received message', { type: decoded.content.case });

    switch (decoded.content.case) {
      case 'request': {
        const req = decoded.content.value;
        if (this._state !== RpcState.OPENED && this._state !== RpcState.OPENING) {
          log('received request while closed');
          await this._sendMessage({
            content: {
              case: 'response',
              value: {
                id: req.id,
                content: { case: 'error', value: encodeError(new RpcClosedError()) },
              },
            },
          });
          return;
        }

        if (req.stream) {
          log('stream request', { method: req.method });
          this._callStreamHandler(req, (responseInit) => {
            log('sending stream response', {
              method: req.method,
              response: responseInit.content?.case === 'payload' ? responseInit.content.value?.typeUrl : undefined,
              error: responseInit.content?.case === 'error' ? responseInit.content.value : undefined,
              close: responseInit.content?.case === 'close' ? responseInit.content.value : undefined,
            });

            void this._sendMessage({ content: { case: 'response', value: responseInit } }).catch((err) => {
              log.warn('failed during close', err);
            });
          });
        } else {
          DEBUG_CALLS && log.trace('requesting...', { method: req.method });
          const responseInit = await this._callHandler(req);
          DEBUG_CALLS &&
            log.trace('sending response', {
              method: req.method,
              response: responseInit.content?.case === 'payload' ? responseInit.content.value?.typeUrl : undefined,
              error: responseInit.content?.case === 'error' ? responseInit.content.value : undefined,
            });
          await this._sendMessage({ content: { case: 'response', value: responseInit } });
        }
        break;
      }

      case 'response': {
        if (this._state !== RpcState.OPENED) {
          log('received response while closed');
          return; // Ignore when not open.
        }

        const response = decoded.content.value;
        const responseId = response.id;
        invariant(typeof responseId === 'number');
        if (!this._outgoingRequests.has(responseId)) {
          log.trace('received response with invalid id', { responseId });
          return; // Ignore requests with incorrect id.
        }

        const item = this._outgoingRequests.get(responseId)!;
        // Delete the request record if no more responses are expected.
        if (!item.stream) {
          this._outgoingRequests.delete(responseId);
        }

        DEBUG_CALLS &&
          log.trace('response', {
            type_url: response.content.case === 'payload' ? response.content.value.typeUrl : undefined,
          });
        item.resolve(response);
        break;
      }

      case 'open': {
        log('received open message', { state: this._state });
        if (this._params.noHandshake) {
          return;
        }

        await this._sendMessage({ content: { case: 'openAck', value: true } });
        break;
      }

      case 'openAck': {
        log('received openAck message', { state: this._state });
        if (this._params.noHandshake) {
          return;
        }

        this._state = RpcState.OPENED;
        this._remoteOpenTrigger.wake();
        break;
      }

      case 'streamClose': {
        if (this._state !== RpcState.OPENED) {
          log('received stream close while closed');
          return; // Ignore when not open.
        }

        const streamCloseId = decoded.content.value.id;
        log('received stream close', { id: streamCloseId });
        invariant(typeof streamCloseId === 'number');
        const stream = this._localStreams.get(streamCloseId);
        if (!stream) {
          log('no local stream', { id: streamCloseId });
          return; // Ignore requests with incorrect id.
        }

        this._localStreams.delete(streamCloseId);
        await stream.close();
        break;
      }

      case 'bye': {
        this._byeTrigger.wake();
        // If we haven't already started closing, close now.
        if (this._state !== RpcState.CLOSING && this._state !== RpcState.CLOSED) {
          log('replying to bye');
          this._state = RpcState.CLOSING;
          await this._sendMessage({ content: { case: 'bye', value: {} } });

          this._abortRequests();
          this._disposeAndClose();
        }
        break;
      }

      default: {
        log.error('received malformed message', { msg });
        throw new Error('Malformed message.');
      }
    }
  }

  /**
   * Make RPC call. Will trigger a handler on the other side.
   * Peer should be open before making this call.
   */
  async call(method: string, request: Any, options?: RequestOptions): Promise<Any> {
    DEBUG_CALLS && log.trace('calling...', { method });
    throwIfNotOpen(this._state);

    let response: Response;
    try {
      // Set-up response listener.
      const id = this._nextId++;
      const responseReceived = new Promise<Response>((resolve, reject) => {
        this._outgoingRequests.set(id, new PendingRpcRequest(resolve, reject, false));
      });

      let traceContext;
      try {
        traceContext = options?.ctx ? ContextRpcCodec.encode(options.ctx) : undefined;
      } catch (err) {
        log.warn('failed to encode trace context', { err });
      }

      // Send request call.
      const sending = this._sendMessage({
        content: {
          case: 'request',
          value: {
            id,
            method,
            payload: request,
            stream: false,
            ...(traceContext ? { traceContext } : {}),
          },
        },
      });

      // Wait until send completes or throws an error (or response throws a timeout), the resume waiting.
      const timeout = options?.timeout ?? this._params.timeout;
      const waiting =
        timeout === 0 ? responseReceived : asyncTimeout<any>(responseReceived, timeout ?? DEFAULT_TIMEOUT);

      await Promise.race([sending, waiting]);
      response = await waiting;
      invariant(response.id === id);
    } catch (err) {
      if (err instanceof RpcClosedError) {
        // Rethrow the error here to have the correct stack-trace.
        const error = new RpcClosedError();
        error.stack += `\n\n info: RPC client was closed at:\n${err.stack?.split('\n').slice(1).join('\n')}`;
        throw error;
      }

      throw err;
    }

    if (response.content.case === 'payload') {
      return response.content.value;
    } else if (response.content.case === 'error') {
      throw decodeRpcError(response.content.value, method);
    } else {
      throw new Error('Malformed response.');
    }
  }

  /**
   * Make RPC call with a streaming response.
   * Will trigger a handler on the other side.
   * Peer should be open before making this call.
   */
  callStream(method: string, request: Any, options?: RequestOptions): Stream<Any> {
    throwIfNotOpen(this._state);
    const id = this._nextId++;

    return new Stream(({ ready, next, close }) => {
      const onResponse = (response: Response) => {
        switch (response.content.case) {
          case 'streamReady':
            ready();
            break;
          case 'close':
            close();
            break;
          case 'error':
            // TODO(dmaretskyi): Stack trace might be lost because the stream producer function is called asynchronously.
            close(decodeRpcError(response.content.value, method));
            break;
          case 'payload':
            next(response.content.value!);
            break;
          default:
            throw new Error('Malformed response.');
        }
      };

      const stack = new StackTrace();
      const closeStream = (err?: Error) => {
        if (!err) {
          close();
        } else {
          err.stack += `\n\nError happened in the stream at:\n${stack.getStack()}`;
          close(err);
        }
      };

      this._outgoingRequests.set(id, new PendingRpcRequest(onResponse, closeStream, true));

      let traceContext;
      try {
        traceContext = options?.ctx ? ContextRpcCodec.encode(options.ctx) : undefined;
      } catch (err) {
        log.warn('failed to encode trace context', { err });
      }

      try {
        this._sendMessage({
          content: {
            case: 'request',
            value: {
              id,
              method,
              payload: request,
              stream: true,
              ...(traceContext ? { traceContext } : {}),
            },
          },
        }).catch((err) => {
          this._outgoingRequests.delete(id);
          close(err);
        });
      } catch (err) {
        this._outgoingRequests.delete(id);
        throw err;
      }

      return () => {
        this._sendMessage({
          content: { case: 'streamClose', value: { id } },
        }).catch((err) => {
          log.catch(err);
        });
        this._outgoingRequests.delete(id);
      };
    });
  }

  private async _sendMessage(message: RpcMessageInit, timeout?: number): Promise<void> {
    DEBUG_CALLS && log.trace('sending message', { type: message.content?.case });
    await this._params.port.send(RpcMessageCodec.encode(message), timeout);
  }

  private _getHandlerRpcOptions(req: Request): RequestOptions | undefined {
    let traceCtx: Context | undefined;
    if (req.traceContext) {
      try {
        traceCtx = ContextRpcCodec.decode(req.traceContext);
      } catch (err) {
        log.warn('failed to decode trace context', { traceContext: req.traceContext, err });
      }
    }
    if (!traceCtx && !this._params.handlerRpcOptions) {
      return undefined;
    }
    return { ...this._params.handlerRpcOptions, ...(traceCtx ? { ctx: traceCtx } : {}) };
  }

  private async _callHandler(req: Request): Promise<ResponseInit> {
    try {
      invariant(typeof req.id === 'number');
      invariant(req.payload);
      invariant(req.method);

      const response = await this._params.callHandler(req.method, req.payload, this._getHandlerRpcOptions(req));
      return {
        id: req.id,
        content: {
          case: 'payload',
          value: response,
        },
      };
    } catch (err) {
      return {
        id: req.id,
        content: { case: 'error', value: encodeError(err) },
      };
    }
  }

  private _callStreamHandler(req: Request, callback: (response: ResponseInit) => void): void {
    try {
      invariant(this._params.streamHandler, 'Requests with streaming responses are not supported.');
      invariant(typeof req.id === 'number');
      invariant(req.payload);
      invariant(req.method);

      const responseStream = this._params.streamHandler(req.method, req.payload!, this._getHandlerRpcOptions(req));
      responseStream.onReady(() => {
        callback({
          id: req.id,
          content: { case: 'streamReady', value: true },
        });
      });

      responseStream.subscribe(
        (msg) => {
          callback({
            id: req.id,
            content: { case: 'payload', value: msg },
          });
        },
        (error) => {
          if (error) {
            callback({
              id: req.id,
              content: { case: 'error', value: encodeError(error) },
            });
          } else {
            callback({
              id: req.id,
              content: { case: 'close', value: true },
            });
          }
        },
      );

      this._localStreams.set(req.id, responseStream);
    } catch (err: any) {
      callback({
        id: req.id,
        content: { case: 'error', value: encodeError(err) },
      });
    }
  }
}

const throwIfNotOpen = (state: RpcState) => {
  switch (state) {
    case RpcState.OPENED: {
      return;
    }
    case RpcState.INITIAL: {
      throw new RpcNotOpenError();
    }
    case RpcState.CLOSED: {
      throw new RpcClosedError();
    }
  }
};
