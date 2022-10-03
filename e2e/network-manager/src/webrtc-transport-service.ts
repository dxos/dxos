//
// Copyright 2022 DXOS.org
//

import wrtc from '@koush/wrtc';
import assert from 'assert';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { BridgeService, ConnectionRequest, SignalRequest, DataRequest, BridgeEvent, ConnectionState, CloseRequest } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

export class WebRTCTransportService implements BridgeService {
  protected peers = new ComplexMap<PublicKey, SimplePeer>(key => key.toHex());

  constructor (
    private readonly _webrtcConfig?: any
  ) {
  }

  open (request: ConnectionRequest): Stream<BridgeEvent> {
    return new Stream(({ ready, next, close }) => {

      console.log(`Creating webrtc connection initiator=${request.initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
      const peer = new SimplePeerConstructor({
        initiator: request.initiator,
        wrtc: wrtc,
        config: this._webrtcConfig
      });

      next({
        connection: {
          state: ConnectionState.CONNECTING
        }
      });

      peer.on('data', async payload => {
        console.log('WRTC stream data');
        next({
          data: {
            payload
          }
        });
      });

      peer.on('signal', async data => {
        console.log('WRTC stream signal');
        next({
          signal: {
            payload: { json: JSON.stringify(data) }
          }
        });
      });

      peer.on('connect', () => {
        console.log('WRTC stream connect');
        next({
          connection: {
            state: ConnectionState.CONNECTED
          }
        });
      });

      peer.on('error', async (err) => {
        console.log('WRTC stream error');
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString()
          }
        });
        close(err);
      });

      peer.on('close', async () => {
        console.log('WRTC stream close');
        next({
          connection: {
            state: ConnectionState.CLOSED
          }
        });
        close();
      });

      this.peers.set(request.sessionId, peer);

      ready();
    });
  }

  async sendSignal ({ sessionId, signal }: SignalRequest): Promise<void> {
    assert(this.peers.has(sessionId), 'Connection not ready to accept signals.');
    assert(signal.json, 'Signal message must contain signal data.');
    console.log(`WRTC received signal ${signal}`);
    this.peers.get(sessionId)!.signal(JSON.parse(signal.json));
  }

  async sendData ({ sessionId, payload }: DataRequest): Promise<void> {
    assert(this.peers.has(sessionId));
    console.log('Writing into WebRTC stream');
    this.peers.get(sessionId)!.write(payload);
  }

  async close ({ sessionId }: CloseRequest) {
    this.peers.get(sessionId)?.destroy();
    this.peers.delete;
    log('Closed.');
  }
}
