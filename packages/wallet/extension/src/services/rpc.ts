//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as pb from 'protobufjs';
import { Runtime } from 'webextension-polyfill-ts';

import { Event, trigger } from '@dxos/async';

import { schema, schemaJson } from '../proto/gen';

const root = pb.Root.fromJSON(schemaJson);
const BackgroundService = root.lookupService('BackgroundService');

export class ResponseStream {
  readonly message = new Event<Uint8Array>()
}

interface RpcPort {
  sendMessage: (msg: Uint8Array) => void,
  subscribe: (cb: (msg: Uint8Array) => void) => (() => void),
}

export class RpcClient {
  private _nextId = 0;

  private readonly _requests = new Map<string, (response: Uint8Array) => void>() // eslint-disable-line func-call-spacing

  private readonly _streamRequests = new Map<string, ResponseStream>()

  private _unsubscribe: (() => void) | undefined

  constructor (
    private readonly _port: RpcPort
  ) {
    console.log('Client constructor', { BackgroundService });

    this._unsubscribe = _port.subscribe(msg => { // encoded
      try {
        const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').decode(msg);

        assert(response.id);
        const cb = this._requests.get(response.id);
        const responseStream = this._streamRequests.get(response.id);
        if (cb) {
          assert(response.payload);
          cb(response.payload);
        } else if (responseStream) {
          assert(response.payload);
          responseStream.message.emit(response.payload);
        } else {
          console.warn('Request without a corresponding entry in a map of requests and response streams', { response });
        }
      } catch (err) {
        console.error('Processing message failed.');
        console.error(err);
      }
    });
  }

  async call (method: string, payload: Uint8Array): Promise<Uint8Array> {
    const id = (this._nextId++).toString();

    const [done, resolve] = trigger<Uint8Array>();
    this._requests.set(id, resolve);

    const request = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({
      id,
      method,
      payload
    });

    this._port.sendMessage(request);

    const response = await done(); // encoded payload

    this._requests.delete(id);

    return response;
  }

  callAndSubscribe (method: string, payload: Uint8Array): ResponseStream {
    const id = (this._nextId++).toString();

    const request = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({
      id,
      method,
      payload,
      streamResponse: true
    });

    const responseStream = new ResponseStream();
    this._streamRequests.set(id, responseStream);

    this._port.sendMessage(request);

    return responseStream;
  }

  close () {
    this._unsubscribe?.();
  }
}

export class RpcServer {
  constructor (
    private readonly _handle: (method: string, request: Uint8Array) => Promise<Uint8Array | ResponseStream>
  ) {
    console.log('Server constructor', { BackgroundService });
  }

  handleConnection (connection: RpcPort) {
    connection.subscribe(async msg => {
      console.log('handleConnection', { msg });

      const request = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').decode(msg);
      console.log({ request });

      assert(request.method);
      assert(request.payload);
      const result = await this._handle(request.method, request.payload);
      console.log({ result });

      if (request.streamResponse) {
        assert(result instanceof ResponseStream, 'Expected result to be a response stream.');

        // TODO: handle unsubscribe
        result.message.on(message => {
          const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').encode({
            id: request.id,
            payload: message
          });
          connection.sendMessage(response);
        });
      } else {
        assert(!(result instanceof ResponseStream), 'Expect result not to be a response stream.');

        const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').encode({
          id: request.id,
          payload: result
        });
        await connection.sendMessage(response);
      }
    });
  }
}

export function wrapPort (port: Runtime.Port): RpcPort {
  return {
    sendMessage: async (msg) => port.postMessage(Array.from(msg)),
    subscribe: cb => {
      const handler = (msg: any) => {
        cb(new Uint8Array(msg));
      };

      port.onMessage.addListener(handler);
      return () => port.onMessage.removeListener(handler);
    }
  };
}
