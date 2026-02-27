//
// Copyright 2021 DXOS.org
//

import { Trigger, asyncTimeout, synchronized } from '@dxos/async';
import { type Any, type ProtoCodec, type RequestOptions, Stream } from '@dxos/codec-protobuf';
import { StackTrace } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { RpcClosedError, RpcNotOpenError, encodeError } from '@dxos/protocols';
import { type Request, type Response, type RpcMessage } from '@dxos/protocols/buf/dxos/rpc_pb';
import { schema } from '@dxos/protocols/proto';
import { exponentialBackoffInterval } from '@dxos/util';

import { decodeRpcError } from './errors';

const DEFAULT_TIMEOUT = 3_000;
const BYE_SEND_TIMEOUT = 2_000;

const DEBUG_CALLS = true;

/**
 * Convert proto-shaped RpcMessage (direct oneof fields) to buf-shaped (discriminated union on `content`).
 * Proto codec returns `{ request?, response?, open?, openAck?, streamClose?, bye? }`.
 * Buf expects `{ content: { case: 'request', value } | ... }`.
 */
const protoRpcMessageToBuf = (raw: any): RpcMessage => {
  let content: RpcMessage['content'];
  if (raw.request) {
    content = { case: 'request', value: { ...raw.request, payload: raw.request.payload } };
  } else if (raw.response) {
    content = { case: 'response', value: protoResponseToBuf(raw.response) };
  } else if (raw.open !== undefined && raw.open !== null) {
    content = { case: 'open', value: raw.open };
  } else if (raw.openAck !== undefined && raw.openAck !== null) {
    content = { case: 'openAck', value: raw.openAck };
  } else if (raw.streamClose) {
    content = { case: 'streamClose', value: raw.streamClose };
  } else if (raw.bye) {
    content = { case: 'bye', value: raw.bye };
  } else {
    content = { case: undefined, value: undefined };
  }
  return { content } as any;
};

const protoResponseToBuf = (raw: any): Response => {
  let content: Response['content'];
  if (raw.payload) {
    content = { case: 'payload', value: raw.payload };
  } else if (raw.error) {
    content = { case: 'error', value: raw.error };
  } else if (raw.close) {
    content = { case: 'close', value: raw.close };
  } else if (raw.streamReady) {
    content = { case: 'streamReady', value: raw.streamReady };
  } else {
    content = { case: undefined, value: undefined };
  }
  return { id: raw.id, content } as any;
};

/**
 * Convert buf-shaped RpcMessage to proto-shaped for the proto codec.
 */
const bufRpcMessageToProto = (msg: any): any => {
  const c = msg.content;
  if (!c || c.case === undefined) {
    return {};
  }
  if (c.case === 'response') {
    return { response: bufResponseToProto(c.value) };
  }
  return { [c.case]: c.value };
};

const bufResponseToProto = (resp: any): any => {
  const c = resp.content;
  if (!c || c.case === undefined) {
    return { id: resp.id };
  }
  return { id: resp.id, [c.case]: c.value };
};

type MaybePromise<T> = Promise<T> | T;

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

// NOTE: Lazy so that code that doesn't use indexing doesn't need to load the codec (breaks in workerd).
let RpcMessageCodec!: ProtoCodec<any>;
const getRpcMessageCodec = () => (RpcMessageCodec ??= schema.getCodecForType('dxos.rpc.RpcMessage'));

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
  private readonly _localStreams = new Map<number, Stream<any>>();
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
      return; // TODO(dmaretskyi): Throw error?
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
    // Proto codec returns proto-shaped oneof (direct fields); convert to buf discriminated union.
    const raw: any = getRpcMessageCodec().decode(msg, { preserveAny: true });
    const decoded = protoRpcMessageToBuf(raw);
    DEBUG_CALLS && log('received message', { type: decoded.content.case });

    switch (decoded.content.case) {
      case 'request': {
        const req = decoded.content.value;
        if (this._state !== RpcState.OPENED && this._state !== RpcState.OPENING) {
          log('received request while closed');
          await this._sendMessage({
            content: {
              case: 'response',
              value: { id: req.id, content: { case: 'error', value: encodeError(new RpcClosedError()) } },
            },
          } as any);
          return;
        }

        if (req.stream) {
          log('stream request', { method: req.method });
          this._callStreamHandler(req, (response) => {
            log('sending stream response', {
              method: req.method,
              responseCase: response.content.case,
            });

            void this._sendMessage({ content: { case: 'response', value: response } } as any).catch((err) => {
              log.warn('failed during close', err);
            });
          });
        } else {
          DEBUG_CALLS && log('requesting...', { method: req.method });
          const response = await this._callHandler(req);
          DEBUG_CALLS &&
            log('sending response', {
              method: req.method,
              responseCase: response.content.case,
            });
          await this._sendMessage({ content: { case: 'response', value: response } } as any);
        }
        break;
      }

      case 'response': {
        if (this._state !== RpcState.OPENED) {
          log('received response while closed');
          return;
        }

        const resp = decoded.content.value;
        const responseId = resp.id;
        invariant(typeof responseId === 'number');
        if (!this._outgoingRequests.has(responseId)) {
          log('received response with invalid id', { responseId });
          return;
        }

        const item = this._outgoingRequests.get(responseId)!;
        if (!item.stream) {
          this._outgoingRequests.delete(responseId);
        }

        DEBUG_CALLS && log('response', { contentCase: resp.content.case });
        item.resolve(resp);
        break;
      }

      case 'open': {
        log('received open message', { state: this._state });
        if (this._params.noHandshake) {
          return;
        }
        await this._sendMessage({ content: { case: 'openAck', value: true } } as any);
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
          return;
        }

        const streamClose = decoded.content.value;
        log('received stream close', { id: streamClose.id });
        invariant(typeof streamClose.id === 'number');
        const localStream = this._localStreams.get(streamClose.id);
        if (!localStream) {
          log('no local stream', { id: streamClose.id });
          return;
        }

        this._localStreams.delete(streamClose.id);
        await localStream.close();
        break;
      }

      case 'bye': {
        this._byeTrigger.wake();
        if (this._state !== RpcState.CLOSING && this._state !== RpcState.CLOSED) {
          log('replying to bye');
          this._state = RpcState.CLOSING;
          await this._sendMessage({ content: { case: 'bye', value: {} } } as any);

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
    DEBUG_CALLS && log('calling...', { method });
    throwIfNotOpen(this._state);

    let response: Response;
    try {
      // Set-up response listener.
      const id = this._nextId++;
      const responseReceived = new Promise<Response>((resolve, reject) => {
        this._outgoingRequests.set(id, new PendingRpcRequest(resolve, reject, false));
      });

      // Send request call.
      const sending = this._sendMessage({
        content: { case: 'request', value: { id, method, payload: request, stream: false } },
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
      return response.content.value as any;
    } else if (response.content.case === 'error') {
      throw decodeRpcError(response.content.value as any, method);
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
            close(decodeRpcError(response.content.value as any, method));
            break;
          case 'payload':
            next(response.content.value as any);
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

      this._sendMessage({
        content: { case: 'request', value: { id, method, payload: request, stream: true } },
      }).catch((err) => {
        close(err);
      });

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

  private async _sendMessage(message: any, timeout?: number): Promise<void> {
    // Convert buf-shaped oneof to proto-shaped for the proto codec.
    const protoMsg = bufRpcMessageToProto(message);
    DEBUG_CALLS && log('sending message', { type: message.content?.case });
    await this._params.port.send(getRpcMessageCodec().encode(protoMsg, { preserveAny: true }), timeout);
  }

  private async _callHandler(req: Request): Promise<Response> {
    try {
      invariant(typeof req.id === 'number');
      invariant(req.payload);
      invariant(req.method);

      const response = await this._params.callHandler(req.method, req.payload as any, this._params.handlerRpcOptions);
      return {
        id: req.id,
        content: { case: 'payload', value: response },
      } as any;
    } catch (err) {
      return {
        id: req.id,
        content: { case: 'error', value: encodeError(err) },
      } as any;
    }
  }

  private _callStreamHandler(req: Request, callback: (response: Response) => void): void {
    try {
      invariant(this._params.streamHandler, 'Requests with streaming responses are not supported.');
      invariant(typeof req.id === 'number');
      invariant(req.payload);
      invariant(req.method);

      const responseStream = this._params.streamHandler(req.method, req.payload as any, this._params.handlerRpcOptions);
      responseStream.onReady(() => {
        callback({ id: req.id, content: { case: 'streamReady', value: true } } as any);
      });

      responseStream.subscribe(
        (msg) => {
          callback({ id: req.id, content: { case: 'payload', value: msg } } as any);
        },
        (error) => {
          if (error) {
            callback({ id: req.id, content: { case: 'error', value: encodeError(error) } } as any);
          } else {
            callback({ id: req.id, content: { case: 'close', value: true } } as any);
          }
        },
      );

      this._localStreams.set(req.id, responseStream);
    } catch (err: any) {
      callback({ id: req.id, content: { case: 'error', value: encodeError(err) } } as any);
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
