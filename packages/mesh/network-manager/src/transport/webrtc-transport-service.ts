//
// Copyright 2022 DXOS.org
//

import wrtc from '@koush/wrtc';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { WebRTCService, ConnectionRequest, SignalRequest, DataRequest, Event as WebRTCEvent, ConnectionState, CloseRequest } from '@dxos/protocols/proto/dxos/mesh/webrtc';

import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import assert from 'assert';

export class WebRTCTransportService implements WebRTCService {
  protected peer: SimplePeer | undefined;

  constructor(
    private readonly _webrtcConfig?: any
  ) {
  }

  open(request: ConnectionRequest): Stream<WebRTCEvent> {
    return new Stream(({ ready, next, close }) => {

      log(`Creating webrtc connection initiator=${request.initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
      this.peer = new SimplePeerConstructor({
        initiator: request.initiator,
        wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc,
        config: this._webrtcConfig
      });

      next({
        connection: {
          state: ConnectionState.CONNECTING
        }
      })

      this.peer.on('signal', async data => {
        next({
          signal: {
            payload: { json: JSON.stringify(data) }
          }
        });
      });

      this.peer.on('connect', () => {
        next({
          connection: {
            state: ConnectionState.CONNECTED
          }
        });
      });

      this.peer.on('error', async (err) => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString()
          }
        });
        close(err);
      });

      this.peer.on('close', async () => {
        next({
          connection: {
            state: ConnectionState.CLOSED
          }
        });
        close();
      });

      ready();
    });
  }

  async sendSignal({ signal }: SignalRequest): Promise<void> {
    assert(this.peer, 'Connection not ready to accept signals.');
    assert(signal.json, 'Signal message must contain signal data.');
    this.peer!.signal(JSON.parse(signal.json));
  }

  async sendData(request: DataRequest): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async close({ }: CloseRequest) {
    this.peer!.destroy();
    log('Closed.');
  }
}