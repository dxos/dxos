//
// Copyright 2022 DXOS.org
//

import wrtc from '@koush/wrtc';
import assert from 'assert';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { BridgeService, ConnectionRequest, SignalRequest, DataRequest, BridgeEvent, ConnectionState, CloseRequest } from '@dxos/protocols/proto/dxos/mesh/bridge';

export class WebRTCTransportService implements BridgeService {
  protected peers = new Map<number, SimplePeer>();

  constructor (
    private readonly _webrtcConfig?: any
  ) {
  }

  open (request: ConnectionRequest): Stream<BridgeEvent> {
    return new Stream(({ ready, next, close }) => {

      log(`Creating webrtc connection initiator=${request.initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
      const peer = new SimplePeerConstructor({
        initiator: request.initiator,
        wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc,
        config: this._webrtcConfig
      });

      next({
        connection: {
          state: ConnectionState.CONNECTING
        }
      });

      peer.on('data', async (payload) => {
        next({
          data: {
            payload
          }
        });
      });

      peer.on('signal', async data => {
        next({
          signal: {
            payload: { json: JSON.stringify(data) }
          }
        });
      });

      peer.on('connect', () => {
        next({
          connection: {
            state: ConnectionState.CONNECTED
          }
        });
      });

      peer.on('error', async (err) => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString()
          }
        });
        close(err);
      });

      peer.on('close', async () => {
        next({
          connection: {
            state: ConnectionState.CLOSED
          }
        });
        close();
      });

      this.peers.set(request.connectionId, peer);

      ready();
    });
  }

  async sendSignal ({ connectionId, signal }: SignalRequest): Promise<void> {
    assert(this.peers.has(connectionId), 'Connection not ready to accept signals.');
    assert(signal.json, 'Signal message must contain signal data.');
    this.peers.get(connectionId)!.signal(JSON.parse(signal.json));
  }

  async sendData ({ connectionId, payload }: DataRequest): Promise<void> {
    assert(this.peers.has(connectionId));
    this.peers.get(connectionId)!.write(payload);
  }

  async close ({ connectionId }: CloseRequest) {
    this.peers.get(connectionId)?.destroy();
    this.peers.delete;
    log('Closed.');
  }
}
